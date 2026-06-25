import { NextRequest, NextResponse } from "next/server";
import { OpportunityAlertSchema, saveOpportunityAlert } from "@/lib/opportunities";

export async function POST(request: NextRequest) {
  const payload = OpportunityAlertSchema.safeParse(await request.json().catch(() => ({})));

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid opportunity alert payload.", issues: payload.error.flatten() }, { status: 400 });
  }

  try {
    const alert = await saveOpportunityAlert(payload.data);
    return NextResponse.json(alert);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save opportunity alert." },
      { status: 500 },
    );
  }
}
