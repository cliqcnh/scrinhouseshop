import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getServerEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");

  // Determine landing page destination from OAuth state payload or query parameter
  let next = "/account";
  if (stateParam) {
    try {
      const parsed = JSON.parse(decodeURIComponent(stateParam));
      if (parsed.next) {
        const rawNext = parsed.next;
        if (rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes(":")) {
          next = rawNext;
        }
      }
    } catch {
      // Ignore parse issues
    }
  } else {
    const rawNext = searchParams.get("next") ?? "/account";
    if (rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes(":")) {
      next = rawNext;
    }
  }

  // Handle proxy headers (Vercel) to preserve the public user-facing domain
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  const currentOrigin = host ? `${proto}://${host}` : origin;

  // Next.js 15 cookies store and custom response cookie tracking
  const cookieStore = await cookies();
  const cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];

  const isScrinhouse = host?.endsWith("scrinhouse.com");
  const cookieDomain = isScrinhouse ? ".scrinhouse.com" : undefined;

  const env = getServerEnv();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: cookieDomain ? { domain: cookieDomain } : undefined,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesList) {
          cookiesList.forEach((c) => {
            const opts = cookieDomain ? { ...c.options, domain: cookieDomain } : c.options;
            try {
              cookieStore.set(c.name, c.value, opts);
            } catch {
              // Ignore in read-only server context
            }
            cookiesToSet.push({ name: c.name, value: c.value, options: opts });
          });
        },
      },
    }
  );

  // Helper: ensures all Set-Cookie headers are attached directly to the redirect response
  function createRedirectResponse(targetUrl: string) {
    const response = NextResponse.redirect(targetUrl);
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
    });
    return response;
  }

  if (code) {
    try {
      // 1. Try standard Supabase PKCE code exchange (used by supabase.auth.signInWithOAuth)
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      // 2. If PKCE exchange fails, fallback to direct Google OAuth token exchange (used by custom signInWithGoogle)
      if (exchangeError) {
        console.warn("Supabase exchangeCodeForSession failed:", exchangeError.message, "trying direct Google token exchange...");

        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID || "",
            client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
            redirect_uri: `${currentOrigin}/auth/callback`,
            grant_type: "authorization_code",
          }),
        });

        const tokens = await tokenResponse.json();
        if (tokens.error || !tokens.id_token) {
          console.error("OAuth code exchange failed: Supabase error:", exchangeError.message, "Google token error:", tokens.error, tokens.error_description);
          return createRedirectResponse(`${currentOrigin}/auth/login?error=oauth_failed&reason=${encodeURIComponent(exchangeError.message)}`);
        }

        // Log in to Supabase with Google ID Token
        const { error: authError } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: tokens.id_token,
        });

        if (authError) {
          console.error("Supabase signInWithIdToken failed:", authError.message);
          return createRedirectResponse(`${currentOrigin}/auth/login?error=oauth_failed&reason=${encodeURIComponent(authError.message)}`);
        }
      }

      // Check if user has phone number configured in their profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile?.phone) {
          return createRedirectResponse(
            `${currentOrigin}/auth/phone?next=${encodeURIComponent(next)}`
          );
        }
      }

      return createRedirectResponse(`${currentOrigin}${next}`);
    } catch (err) {
      console.error("Error in Google OAuth callback handler:", err);
      const errMsg = err instanceof Error ? err.message : "unknown_error";
      return createRedirectResponse(`${currentOrigin}/auth/login?error=oauth_failed&reason=${encodeURIComponent(errMsg)}`);
    }
  }

  return createRedirectResponse(`${currentOrigin}/auth/login?error=no_code`);
}
