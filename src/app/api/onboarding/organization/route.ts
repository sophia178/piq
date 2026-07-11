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
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      console.error("[onboarding/organization] Supabase client not configured");
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error("[onboarding/organization] Auth error:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!userData?.user) {
      console.error("[onboarding/organization] No user data found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error("[onboarding/organization] Failed to parse request body:", parseError);
      requestBody = {};
    }

    const payload = OrganizationSetupSchema.safeParse(requestBody);
    if (!payload.success) {
      console.error("[onboarding/organization] Invalid payload:", payload.error.flatten());
      return NextResponse.json({ error: "Invalid organization setup payload.", issues: payload.error.flatten() }, { status: 400 });
    }

    const service = createServiceSupabaseClient();
    if (!service) {
      console.error("[onboarding/organization] Service client could not be created");
      return NextResponse.json({ error: "Supabase service client could not be created." }, { status: 503 });
    }

    const { data: existingMembership, error: membershipError } = await service
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userData.user.id)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      console.error("[onboarding/organization] Error checking existing membership:", membershipError);
    }

    if (existingMembership?.organization_id) {
      const organizationId = existingMembership.organization_id as string;
      console.log("[onboarding/organization] Updating existing organization:", organizationId);

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
        console.error("[onboarding/organization] Update failed:", updateResponse.error);
        return NextResponse.json({ error: updateResponse.error.message }, { status: 400 });
      }

      console.log("[onboarding/organization] Organization updated successfully:", organizationId);
      return NextResponse.json({ organizationId });
    }

    console.log("[onboarding/organization] Creating new organization");
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
      console.error("[onboarding/organization] Insert organization failed:", insertOrg.error);
      return NextResponse.json({ error: insertOrg.error.message }, { status: 400 });
    }

    const organizationId = insertOrg.data.id as string;
    console.log("[onboarding/organization] Organization created:", organizationId);

    console.log("[onboarding/organization] Adding user to organization");
    const insertMember = await service.from("organization_members").insert({
      organization_id: organizationId,
      user_id: userData.user.id,
      role: "owner",
    });

    if (insertMember.error) {
      console.error("[onboarding/organization] Insert member failed:", insertMember.error);
      return NextResponse.json({ error: insertMember.error.message }, { status: 400 });
    }

    console.log("[onboarding/organization] Success - organization created and user added");
    return NextResponse.json({ organizationId });
  } catch (error) {
    console.error("[onboarding/organization] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

