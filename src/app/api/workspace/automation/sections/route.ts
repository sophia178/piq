import { NextRequest, NextResponse } from "next/server";
import { BidSectionStatusSchema, updateBidSectionStatus } from "@/lib/bid-workspace";

export async function PATCH(request: NextRequest) {
  const payload = BidSectionStatusSchema.safeParse(await request.json().catch(() => ({})));

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid bid section status payload.", issues: payload.error.flatten() }, { status: 400 });
  }

  try {
    const result = await updateBidSectionStatus(payload.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update bid section status." },
      { status: 500 },
    );
  }
}
