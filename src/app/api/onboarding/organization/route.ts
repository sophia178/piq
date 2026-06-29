export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/platform";

const OrganizationSetupSchema = z.object({
  companyName: z.string().min(2),
  industry: z.string().min(2),
  website: z.string().url().optional().or(z.literal("")),
  employeeCount: z.enum(["1-10", "11-50", "51-200", "200+"]),
});

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = OrganizationSetupSchema.safeParse(await request.json().catch(() => ({})));
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid organization setup payload.", issues: payload.error.flatten() }, { status: 400 });
  }

  const service = createServiceSupabaseClient();
  if (!service) {
    return NextResponse.json({ error: "Supabase service client could not be created." }, { status: 503 });
  }

  const { data: existingMembership } = await service
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userData.user.id)
    .limit(1)
    .maybeSingle();

  if (existingMembership?.organization_id) {
    const organizationId = existingMembership.organization_id as string;
    const updateResponse = await service
      .from("organizations")
      .update({
        company_name: payload.data.companyName,
        industry: payload.data.industry,
        website: payload.data.website ? payload.data.website : null,
        employee_count: payload.data.employeeCount,
      })
      .eq("id", organizationId)
      .select("id")
      .maybeSingle();

    if (updateResponse.error) {
      return NextResponse.json({ error: updateResponse.error.message }, { status: 400 });
    }

    return NextResponse.json({ organizationId });
  }

  const insertOrg = await service
    .from("organizations")
    .insert({
      company_name: payload.data.companyName,
      industry: payload.data.industry,
      website: payload.data.website ? payload.data.website : null,
      employee_count: payload.data.employeeCount,
      created_by: userData.user.id,
    })
    .select("id")
    .single();

  if (insertOrg.error) {
    return NextResponse.json({ error: insertOrg.error.message }, { status: 400 });
  }

  const organizationId = insertOrg.data.id as string;
  const insertMember = await service.from("organization_members").insert({
    organization_id: organizationId,
    user_id: userData.user.id,
    role: "owner",
  });

  if (insertMember.error) {
    return NextResponse.json({ error: insertMember.error.message }, { status: 400 });
  }

  return NextResponse.json({ organizationId });
}

