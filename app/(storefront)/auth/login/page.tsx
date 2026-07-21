import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

interface Props {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;

  // Already signed in — bounce them away
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect(next ?? "/account");

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

        <LoginForm next={next} />
      </div>
    </div>
  );
}
