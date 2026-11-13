import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getServerEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

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

  const env = getServerEnv();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesList) {
          cookiesList.forEach((c) => {
            try {
              cookieStore.set(c.name, c.value, c.options);
            } catch {
              // Ignore in read-only server context
            }
            cookiesToSet.push({ name: c.name, value: c.value, options: c.options });
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

  // 1. If provider returned an error query parameter
  if (errorParam) {
    const reason = errorDescription || errorParam;
    return createRedirectResponse(
      `${currentOrigin}/auth/login?error=oauth_failed&reason=${encodeURIComponent(reason)}`
    );
  }

  // 2. Standard PKCE code exchange
  if (code) {
    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (!exchangeError) {
        return createRedirectResponse(`${currentOrigin}${next}`);
      }

      console.warn("Supabase exchangeCodeForSession failed:", exchangeError.message, "trying direct Google token exchange...");

      // Fallback: direct Google OAuth token exchange if custom Google flow was used
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
      if (!tokens.error && tokens.id_token) {
        const { error: authError } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: tokens.id_token,
        });

        if (!authError) {
          return createRedirectResponse(`${currentOrigin}${next}`);
        }
      }

      return createRedirectResponse(
        `${currentOrigin}/auth/login?error=oauth_failed&reason=${encodeURIComponent(exchangeError.message)}`
      );
    } catch (err) {
      console.error("Error in Google OAuth callback handler:", err);
      const errMsg = err instanceof Error ? err.message : "unknown_error";
      return createRedirectResponse(
        `${currentOrigin}/auth/login?error=oauth_failed&reason=${encodeURIComponent(errMsg)}`
      );
    }
  }

  // 3. Fallback: server received no code in query params.
  // The OAuth tokens or errors might be in window.location.hash (#access_token=... or #code=... or #error=...).
  // Serve an inline HTML bridge that parses the client-side hash, syncs the session, and forwards the user.
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Authenticating — ScrinHouse</title>
</head>
<body style="font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#09090b;color:#f4f4f5;">
  <div style="text-align:center;padding:24px;max-width:360px;">
    <div style="width:36px;height:36px;border:3px solid #27272a;border-top-color:#f4f4f5;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>
    <p style="font-size:15px;font-weight:600;margin:0 0 6px;">Completing sign in...</p>
    <p style="font-size:13px;color:#71717a;margin:0;" id="status-text">Verifying credentials</p>
  </div>
  <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  <script>
    (async function() {
      var statusEl = document.getElementById('status-text');
      var hash = window.location.hash || '';
      var destination = ${JSON.stringify(next)} || '/account';

      // Case A: Hash contains an authorization code (#code=...)
      if (hash.includes('code=')) {
        var hashParams = new URLSearchParams(hash.substring(1));
        var code = hashParams.get('code');
        if (code) {
          if (statusEl) statusEl.textContent = 'Exchanging authorization code...';
          window.location.replace('/auth/callback?code=' + encodeURIComponent(code) + '&next=' + encodeURIComponent(destination));
          return;
        }
      }

      // Case B: Hash contains an error (#error=...)
      if (hash.includes('error=')) {
        var hashParams = new URLSearchParams(hash.substring(1));
        var err = hashParams.get('error_description') || hashParams.get('error') || 'oauth_error';
        window.location.replace('/auth/login?error=oauth_failed&reason=' + encodeURIComponent(err));
        return;
      }

      // Case C: Hash contains access_token / refresh_token (Implicit Flow)
      if (hash.includes('access_token=') || hash.includes('refresh_token=')) {
        try {
          if (statusEl) statusEl.textContent = 'Establishing secure session...';
          var hashParams = new URLSearchParams(hash.substring(1));
          var accessToken = hashParams.get('access_token');
          var refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            var syncRes = await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken })
            });

            if (syncRes.ok) {
              window.location.replace(destination);
              return;
            }
          }
        } catch (e) {
          console.error('Session sync error:', e);
        }
      }

      // Case D: Completely empty (no code, no hash tokens, no error)
      window.location.replace('/auth/login?error=no_code');
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
