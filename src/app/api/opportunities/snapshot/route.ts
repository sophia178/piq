import { NextRequest, NextResponse } from "next/server";
import { getOpportunityDiscoverySnapshot } from "@/lib/opportunities";

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get("organizationId") ?? undefined;
    const snapshot = await getOpportunityDiscoverySnapshot(organizationId);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load opportunity snapshot." },
      { status: 500 },
    );
  }
}
