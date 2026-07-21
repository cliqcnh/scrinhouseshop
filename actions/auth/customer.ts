"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

export async function signInWithGoogle(next?: string): Promise<void> {
  const supabase = await createClient();
  const rawNext = next ?? "/account";
  const sanitizedNext = (rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes(":"))
    ? rawNext
    : "/account";

  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(sanitizedNext)}`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.url) {
    redirect(data.url);
  }
}
