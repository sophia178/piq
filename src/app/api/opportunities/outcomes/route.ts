import { NextRequest, NextResponse } from "next/server";
import { BidOutcomeUpsertSchema, saveBidOutcome } from "@/lib/opportunities";

export async function POST(request: NextRequest) {
  const payload = BidOutcomeUpsertSchema.safeParse(await request.json().catch(() => ({})));

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid bid outcome payload.", issues: payload.error.flatten() }, { status: 400 });
  }

  try {
    const result = await saveBidOutcome(payload.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save bid outcome." },
      { status: 500 },
    );
  }
}
