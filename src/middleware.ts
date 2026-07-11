import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const publicRoutes = ["/", "/login", "/signup", "/pricing", "/features", "/privacy", "/terms", "/forgot-password", "/reset-password"];
const authOnlyRoutes = ["/onboarding", "/billing"];
const protectedRoutes = ["/dashboard", "/opportunities", "/workspace", "/predict", "/outcomes", "/reviews", "/knowledge", "/exports", "/responses", "/growth", "/admin", "/projects"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.includes(pathname) || publicRoutes.some((route) => pathname.startsWith(route + "/"))) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(entries: Array<{ name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }>) {
          entries.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  // If not authenticated, redirect to login (except for public routes)
  if (!user) {
    if (authOnlyRoutes.includes(pathname) || authOnlyRoutes.some((route) => pathname.startsWith(route + "/"))) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (protectedRoutes.some((route) => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Auth-only routes (/onboarding, /billing) are allowed for authenticated users without subscription checks
  if (authOnlyRoutes.includes(pathname) || authOnlyRoutes.some((route) => pathname.startsWith(route + "/"))) {
    return NextResponse.next();
  }

  // For protected routes, check organization only
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!membership?.organization_id) {
      return NextResponse.redirect(new URL("/onboarding?step=2", request.url));
    }
  }

  // Allow all other authenticated requests
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
