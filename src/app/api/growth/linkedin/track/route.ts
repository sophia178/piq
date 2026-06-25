import { NextRequest, NextResponse } from "next/server";
import { GrowthTrackSchema, trackLinkedInPerformance } from "@/lib/growth";

export async function POST(request: NextRequest) {
  const payload = GrowthTrackSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid LinkedIn performance payload.", issues: payload.error.flatten() }, { status: 400 });
  }

  const result = await trackLinkedInPerformance(payload.data);
  return NextResponse.json(result);
}
