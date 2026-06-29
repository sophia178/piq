export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { OpportunityScanSchema, runScheduledOpportunityScans } from "@/lib/opportunities";

export async function POST(request: NextRequest) {
  if (!env.opportunityScanCronSecret) {
    return NextResponse.json({ error: "Scheduled opportunity scans are not configured." }, { status: 400 });
  }

  const bearerToken = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  const isAuthorized = bearerToken === `Bearer ${env.opportunityScanCronSecret}` || headerSecret === env.opportunityScanCronSecret;
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized scheduled scan request." }, { status: 401 });
  }

  const payload = OpportunityScanSchema.pick({ lookbackHours: true }).safeParse(await request.json().catch(() => ({})));
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid scheduled scan payload.", issues: payload.error.flatten() }, { status: 400 });
  }

  try {
    const result = await runScheduledOpportunityScans({ lookbackHours: payload.data.lookbackHours });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to run scheduled opportunity scans." },
      { status: 500 },
    );
  }
}
