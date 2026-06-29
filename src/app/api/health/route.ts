export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/platform";
import { hasSupabaseEnv } from "@/lib/env";

const requiredTables = [
  "opportunities",
  "projects",
  "prediction_history",
  "prediction_metrics",
  "prediction_factors",
  "knowledge_documents",
  "bid_outcomes",
  "review_history",
  "organizations",
] as const;

export async function GET() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      {
        ok: false,
        supabase: { ok: false, error: "Supabase environment variables are not configured." },
        tables: Object.fromEntries(requiredTables.map((table) => [table, { ok: false }])),
      },
      { status: 503 },
    );
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        supabase: { ok: false, error: "Supabase service client could not be created." },
        tables: Object.fromEntries(requiredTables.map((table) => [table, { ok: false }])),
      },
      { status: 503 },
    );
  }

  const tables: Record<string, { ok: boolean; error?: string }> = {};

  for (const table of requiredTables) {
    const response = await supabase.from(table).select("id", { head: true, count: "exact" }).limit(1);
    tables[table] = response.error ? { ok: false, error: response.error.message } : { ok: true };
  }

  const ok = Object.values(tables).every((item) => item.ok);
  return NextResponse.json(
    {
      ok,
      supabase: { ok },
      tables,
    },
    { status: ok ? 200 : 503 },
  );
}

