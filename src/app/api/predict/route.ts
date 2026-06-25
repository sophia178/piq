import { NextRequest, NextResponse } from "next/server";
import { PredictOpportunitySchema, predictOpportunity } from "@/lib/predict";

export async function POST(request: NextRequest) {
  const payload = PredictOpportunitySchema.safeParse(await request.json().catch(() => ({})));

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid predict payload.", issues: payload.error.flatten() }, { status: 400 });
  }

  try {
    const result = await predictOpportunity(payload.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate prediction." },
      { status: 500 },
    );
  }
}
