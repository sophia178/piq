import { NextRequest, NextResponse } from "next/server";
import { GrowthPlanSchema, planLinkedInGrowthCampaign } from "@/lib/growth";
import { trackAuditEvent } from "@/lib/platform";

export async function POST(request: NextRequest) {
  const payload = GrowthPlanSchema.safeParse(await request.json().catch(() => ({})));

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid LinkedIn planning payload.", issues: payload.error.flatten() }, { status: 400 });
  }

  const plannedPosts = await planLinkedInGrowthCampaign({
    organizationId: payload.data.organizationId,
    days: payload.data.days,
  });

  await trackAuditEvent({
    action: "growth.linkedin.plan_generated",
    entityType: "growth_plan",
    metadata: {
      organizationId: payload.data.organizationId ?? null,
      days: payload.data.days,
      postCount: plannedPosts.length,
      optimizationGoal: "paid_conversions",
    },
  });

  return NextResponse.json({
    dailyPostTarget: 8,
    optimizationGoal: "paid conversions",
    plannedPosts,
  });
}
