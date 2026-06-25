import { NextRequest, NextResponse } from "next/server";
import { OpportunityPipelineUpdateSchema, updateOpportunityPipelineStage } from "@/lib/opportunities";

export async function PATCH(request: NextRequest) {
  const payload = OpportunityPipelineUpdateSchema.safeParse(await request.json().catch(() => ({})));

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid opportunity pipeline payload.", issues: payload.error.flatten() }, { status: 400 });
  }

  try {
    const result = await updateOpportunityPipelineStage(payload.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update opportunity pipeline." },
      { status: 500 },
    );
  }
}
