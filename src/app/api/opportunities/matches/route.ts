import { NextRequest, NextResponse } from "next/server";
import { OpportunityMatchUpdateSchema, updateOpportunityMatchStatus } from "@/lib/opportunities";

export async function PATCH(request: NextRequest) {
  const payload = OpportunityMatchUpdateSchema.safeParse(await request.json().catch(() => ({})));

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid opportunity match update payload.", issues: payload.error.flatten() }, { status: 400 });
  }

  try {
    const result = await updateOpportunityMatchStatus(payload.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update opportunity match." },
      { status: 500 },
    );
  }
}
