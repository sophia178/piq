import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/platform";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL(nextPath, url));
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.redirect(new URL(nextPath, url));
  }

  await supabase.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL(nextPath, url));
}

