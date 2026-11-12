import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

interface Props {
  searchParams: Promise<{ next?: string; error?: string; reason?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { next, error, reason } = await searchParams;

  // Already signed in — bounce them away
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect(next ?? "/account");

  let initialError: string | null = null;
  if (error) {
    if (reason) {
      initialError = `Google sign in failed: ${reason}`;
    } else if (error === "oauth_failed") {
      initialError = "Google authentication failed. Please try again.";
    } else if (error === "no_code") {
      initialError = "Authentication returned no authorization code. Please try again.";
    } else {
      initialError = `Sign in error: ${error}`;
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-68px)] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        {/* Heading */}
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-bold text-foreground">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            New here?{" "}
            <Link
              href={`/auth/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>

        <LoginForm next={next} initialError={initialError} />
      </div>
    </div>
  );
}
