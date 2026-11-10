"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// ─── Sign Up ─────────────────────────────────────────────────────────────────

export async function signUp(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const email    = (formData.get("email")    as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";
  const fullName = (formData.get("fullName") as string | null)?.trim() ?? "";

  if (!email || !password || !fullName) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) return { error: error.message };

  redirect("/account?welcome=1");
}

// ─── Sign In ─────────────────────────────────────────────────────────────────

export async function signIn(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const email    = (formData.get("email")    as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";
  const rawNext  = (formData.get("next")     as string | null) ?? "/account";

  // H-01 Fix: Sanitize next parameter to prevent open redirect vulnerabilities
  const next = (rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes(":"))
    ? rawNext
    : "/account";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(next);
}

// ─── Sign Out ────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

// ─── Google OAuth Sign In ───────────────────────────────────────────────────

export async function signInWithGoogle(next?: string): Promise<{ error: string | null; url?: string }> {
  const headerList = await headers();
  const host = headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  const currentOrigin = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return { error: "Google OAuth Client ID is not configured in environment variables (GOOGLE_CLIENT_ID)." };
  }

  const rawNext = next ?? "/account";
  const sanitizedNext = (rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes(":"))
    ? rawNext
    : "/account";

  const state = encodeURIComponent(JSON.stringify({ next: sanitizedNext }));
  const redirectUri = `${currentOrigin}/auth/callback`;

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(
    "openid email profile"
  )}&state=${state}`;

  redirect(authUrl);

  return { error: null };
}

// ─── Update Profile Phone ────────────────────────────────────────────────────

export async function updateProfilePhone(phone: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Format and validate phone format
  const cleaned = phone.replace(/[^0-9+]/g, "").trim();
  if (cleaned.length < 9) {
    return { success: false, error: "Phone number is too short (minimum 9 digits)." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ phone: cleaned })
    .eq("id", user.id);

  if (error) {
    console.error("Failed to update profile phone:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
