import { NextRequest, NextResponse } from "next/server";
import { BidReviewRecommendationApplySchema, applyBidReviewRecommendation } from "@/lib/bid-review";

export async function POST(request: NextRequest) {
  const payload = BidReviewRecommendationApplySchema.safeParse(await request.json().catch(() => ({})));

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid review recommendation apply payload.", issues: payload.error.flatten() }, { status: 400 });
  }

  try {
    const result = await applyBidReviewRecommendation(payload.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to apply review recommendation." },
      { status: 500 },
    );
  }
}
