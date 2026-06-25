import { NextRequest, NextResponse } from "next/server";
import { BidTaskStatusSchema, updateBidTaskStatus } from "@/lib/bid-workspace";

export async function PATCH(request: NextRequest) {
  const payload = BidTaskStatusSchema.safeParse(await request.json().catch(() => ({})));

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid bid task status payload.", issues: payload.error.flatten() }, { status: 400 });
  }

  try {
    const result = await updateBidTaskStatus(payload.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update bid task status." },
      { status: 500 },
    );
  }
}
