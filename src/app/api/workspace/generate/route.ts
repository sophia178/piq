import { NextRequest, NextResponse } from "next/server";
import { generateWorkspaceResponses, trackAuditEvent, WorkspaceGenerationSchema } from "@/lib/platform";

export async function POST(request: NextRequest) {
  const payload = WorkspaceGenerationSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid generation payload.", issues: payload.error.flatten() }, { status: 400 });
  }

  const responses = await generateWorkspaceResponses(payload.data);

  await trackAuditEvent({
    action: "workspace.responses_generated",
    entityType: "project",
    entityId: payload.data.projectId,
    metadata: { requirementCount: payload.data.requirementIds.length, tone: payload.data.tone },
  });

  return NextResponse.json({ responses });
}
