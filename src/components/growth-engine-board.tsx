"use client";

import { useMemo, useState } from "react";
import type { GeneratedLinkedInPost, LinkedInPlannedPost } from "@/lib/growth";
import { Badge, Button, Card } from "@/components/ui";

function formatPillar(pillar: string) {
  return pillar.replace(/_/g, " ");
}

function formatPersona(persona: string) {
  return persona.replace(/_/g, " ");
}

export function GrowthEngineBoard({ initialPosts }: { initialPosts: LinkedInPlannedPost[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [generatedPost, setGeneratedPost] = useState<GeneratedLinkedInPost | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const groupedByDay = useMemo<Array<{ day: string; posts: LinkedInPlannedPost[] }>>(() => {
    const grouped = posts.reduce<Record<string, LinkedInPlannedPost[]>>((acc: Record<string, LinkedInPlannedPost[]>, post: LinkedInPlannedPost) => {
      const key = post.publishAt.slice(0, 10);
      acc[key] ??= [];
      acc[key].push(post);
      return acc;
    }, {});

    return Object.keys(grouped)
      .sort()
      .map((day) => ({ day, posts: grouped[day] }));
  }, [posts]);

  async function regeneratePlan() {
    setStatus("Regenerating 8-post/day LinkedIn schedule...");
    const response = await fetch("/api/growth/linkedin/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: 7 }),
    });
    const payload = (await response.json()) as { plannedPosts?: LinkedInPlannedPost[]; error?: string };
    if (payload.plannedPosts) {
      setPosts(payload.plannedPosts);
      setStatus("Calendar updated.");
      return;
    }

    setStatus(payload.error ?? "Unable to regenerate plan.");
  }

  async function generatePost(post: LinkedInPlannedPost) {
    setStatus(`Generating conversion-focused post for ${post.region.toUpperCase()} ${formatPersona(post.persona)}...`);
    const response = await fetch("/api/growth/linkedin/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topicKey: post.topicKey,
        title: post.title,
        angle: post.angle,
        pillar: post.pillar,
        region: post.region,
        persona: post.persona,
        publishAt: post.publishAt,
        cta: post.cta,
        hook: post.hook,
        landingPage: post.landingPage,
      }),
    });
    const payload = (await response.json()) as GeneratedLinkedInPost & { error?: string };
    if (payload.copy) {
      setGeneratedPost(payload);
      setStatus("Post generated.");
      return;
    }

    setStatus(payload.error ?? "Unable to generate post.");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-300">Publishes 8 posts per day across UK, US, Canada, Australia, and EU with a paid-conversion-first optimization loop.</p>
          <p className="mt-2 text-xs text-slate-500">Repetition control blocks reuse of the same topic key for 60 days.</p>
        </div>
        <Button onClick={regeneratePlan}>Regenerate schedule</Button>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <div className="space-y-5">
          {groupedByDay.map(({ day, posts: dayPosts }) => (
            <Card key={day} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{day}</p>
                  <p className="mt-1 text-xs text-slate-500">{dayPosts.length} posts scheduled</p>
                </div>
                <Badge className="bg-white/8">8 per day target</Badge>
              </div>
              <div className="mt-5 space-y-4">
                {dayPosts.map((post) => (
                  <div key={post.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{post.title}</p>
                        <p className="mt-2 text-sm leading-7 text-slate-300">{post.angle}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{formatPillar(post.pillar)}</Badge>
                        <Badge>{post.region.toUpperCase()}</Badge>
                        <Badge>{formatPersona(post.persona)}</Badge>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">Predicted paid conversions drive the ranking score of {Math.round(post.score)}.</p>
                      <Button variant="secondary" onClick={() => generatePost(post)}>
                        Generate post
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Generated LinkedIn copy</p>
          {generatedPost ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-lg font-semibold text-white">{generatedPost.title}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {generatedPost.region.toUpperCase()} • {formatPersona(generatedPost.persona)} • {formatPillar(generatedPost.pillar)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-200">{generatedPost.copy}</pre>
              </div>
              <p className="text-xs text-slate-500">Hashtags: {generatedPost.hashtags.join(" ")}</p>
              <p className="text-xs text-slate-500">UTM campaign: {generatedPost.utmCampaign}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-7 text-slate-300">Select any scheduled topic to generate a regional, persona-specific LinkedIn post optimized for paid conversions.</p>
          )}
          {status ? <p className="mt-4 text-sm text-teal-200">{status}</p> : null}
        </Card>
      </div>
    </div>
  );
}
