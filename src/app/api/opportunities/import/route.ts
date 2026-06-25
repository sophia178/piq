import { NextRequest, NextResponse } from "next/server";
import { bootstrapBidWorkspaceAutomation } from "@/lib/bid-workspace";
import { OpportunityImportSchema, importOpportunityToWorkspace } from "@/lib/opportunities";

export async function POST(request: NextRequest) {
  const payload = OpportunityImportSchema.safeParse(await request.json().catch(() => ({})));

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid opportunity import payload.", issues: payload.error.flatten() }, { status: 400 });
  }

  try {
    const result = await importOpportunityToWorkspace(payload.data);
    await bootstrapBidWorkspaceAutomation({
      organizationId: payload.data.organizationId,
      projectId: result.projectId,
      opportunityId: payload.data.opportunityId,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to import opportunity into workspace." },
      { status: 500 },
    );
  }
}
