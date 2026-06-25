import { NextRequest, NextResponse } from "next/server";
import { BidReviewRunSchema, syncBidReviewForProject } from "@/lib/bid-review";

export async function POST(request: NextRequest) {
  const payload = BidReviewRunSchema.safeParse(await request.json().catch(() => ({})));

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid bid review payload.", issues: payload.error.flatten() }, { status: 400 });
  }

  try {
    const result = await syncBidReviewForProject(payload.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to run bid review." },
      { status: 500 },
    );
  }
}
