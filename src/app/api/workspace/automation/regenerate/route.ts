import { NextRequest, NextResponse } from "next/server";
import { BidSectionRegenerationSchema, regenerateBidSection } from "@/lib/bid-workspace";

export async function POST(request: NextRequest) {
  const payload = BidSectionRegenerationSchema.safeParse(await request.json().catch(() => ({})));

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid bid section regeneration payload.", issues: payload.error.flatten() }, { status: 400 });
  }

  try {
    const result = await regenerateBidSection(payload.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to regenerate bid section." },
      { status: 500 },
    );
  }
}
