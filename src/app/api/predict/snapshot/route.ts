import { NextRequest, NextResponse } from "next/server";
import { getPredictEngineSnapshot } from "@/lib/predict";

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get("organizationId") ?? undefined;
    const snapshot = await getPredictEngineSnapshot(organizationId);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load Predict snapshot." },
      { status: 500 },
    );
  }
}
