import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
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
    } catch (e) {
      // Ignore parse issues
    }
  } else {
    const rawNext = searchParams.get("next") ?? "/account";
    if (rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes(":")) {
      next = rawNext;
    }
  }

  if (code) {
    try {
      // Exchange code for Google access and identity tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          redirect_uri: `${origin}/auth/callback`,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenResponse.json();
      if (tokens.error || !tokens.id_token) {
        console.error("Google token exchange failed:", tokens.error, tokens.error_description);
        return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`);
      }

      // Log in to Supabase with Google ID Token
      const supabase = await createClient();
      const { error: authError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: tokens.id_token,
      });

      if (authError) {
        console.error("Supabase signInWithIdToken failed:", authError.message);
        return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`);
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
          return NextResponse.redirect(
            `${origin}/auth/phone?next=${encodeURIComponent(next)}`
          );
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    } catch (err) {
      console.error("Error in custom Google OAuth callback handler:", err);
      return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`);
}
