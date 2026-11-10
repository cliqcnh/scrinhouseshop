import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getServerEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");

  let next = "/account";
  let hasStateDestination = false;
  if (stateParam) {
    try {
      const parsed = JSON.parse(decodeURIComponent(stateParam));
      const rawNext = parsed.next;
      if (typeof rawNext === "string" && rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes(":")) {
        next = rawNext;
        hasStateDestination = true;
      }
    } catch {
      // Ignore invalid OAuth state and use the safe default.
    }
  }

  if (!hasStateDestination) {
    const rawNext = searchParams.get("next") ?? "/account";
    if (rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes(":")) {
      next = rawNext;
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  const currentOrigin = host ? `${proto}://${host}` : origin;
  const cookieStore = await cookies();
  const cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  const supabase = createServerClient(
    getServerEnv().NEXT_PUBLIC_SUPABASE_URL,
    getServerEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesList) {
          cookiesList.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Route handlers may not allow direct cookie mutation in every context.
            }
            cookiesToSet.push({ name, value, options });
          });
        },
      },
    },
  );

  function redirectWithCookies(targetUrl: string) {
    const response = NextResponse.redirect(targetUrl);
    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    return response;
  }

  if (!code) {
    return redirectWithCookies(`${currentOrigin}/auth/login?error=oauth_failed`);
  }

  try {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.warn("Supabase OAuth code exchange failed:", exchangeError.message);

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
        return redirectWithCookies(`${currentOrigin}/auth/login?error=oauth_failed`);
      }

      const { error: authError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: tokens.id_token,
      });
      if (authError) {
        return redirectWithCookies(`${currentOrigin}/auth/login?error=oauth_failed`);
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.phone) {
        return redirectWithCookies(`${currentOrigin}/auth/phone?next=${encodeURIComponent(next)}`);
      }
    }

    return redirectWithCookies(`${currentOrigin}${next}`);
  } catch (error) {
    console.error("Error in Google OAuth callback:", error);
    return redirectWithCookies(`${currentOrigin}/auth/login?error=oauth_failed`);
  }
}
