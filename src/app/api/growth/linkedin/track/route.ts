import { NextRequest, NextResponse } from "next/server";
import { GrowthTrackSchema, trackLinkedInPerformance } from "@/lib/growth";

export async function POST(request: NextRequest) {
  try {
    const payload = GrowthTrackSchema.safeParse(await request.json());

    if (!payload.success) {
      return NextResponse.json({ error: "Invalid LinkedIn performance payload.", issues: payload.error.flatten() }, { status: 400 });
    }

    const result = await trackLinkedInPerformance(payload.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('LinkedIn tracking error:', error);
    return NextResponse.json({ error: "Failed to track LinkedIn performance." }, { status: 500 });
  }
}
