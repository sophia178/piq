import { NextRequest, NextResponse } from "next/server";
import { generateLinkedInPost, GrowthGenerateSchema } from "@/lib/growth";
import { trackAuditEvent } from "@/lib/platform";

export async function POST(request: NextRequest) {
  const payload = GrowthGenerateSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid LinkedIn generation payload.", issues: payload.error.flatten() }, { status: 400 });
  }

  const post = await generateLinkedInPost(payload.data);

  await trackAuditEvent({
    action: "growth.linkedin.post_generated",
    entityType: "linkedin_post",
    entityId: post.id,
    metadata: {
      topicKey: post.topicKey,
      pillar: post.pillar,
      region: post.region,
      persona: post.persona,
      optimizationGoal: "paid_conversions",
    },
  });

  return NextResponse.json(post);
}
