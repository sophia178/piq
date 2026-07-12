import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, trackAuditEvent } from "@/lib/platform";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
    }

    await supabase.auth.signOut();
    await trackAuditEvent({ action: "auth.logout", entityType: "user" });

    return NextResponse.json({ message: "Logged out successfully." });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: "Failed to logout." }, { status: 500 });
  }
}
