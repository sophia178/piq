import { NextRequest, NextResponse } from "next/server";
import { OpportunityScanSchema, runOpportunityScan } from "@/lib/opportunities";

export async function POST(request: NextRequest) {
  const payload = OpportunityScanSchema.safeParse(await request.json().catch(() => ({})));

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid opportunity scan payload.", issues: payload.error.flatten() }, { status: 400 });
  }

  try {
    const result = await runOpportunityScan(payload.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to run opportunity scan." },
      { status: 500 },
    );
  }
}
