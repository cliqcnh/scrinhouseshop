import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create account" };

interface Props {
  searchParams: Promise<{ next?: string }>;
}

export default async function RegisterPage({ searchParams }: Props) {
  const { next } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect(next ?? "/account");

  return (
    <div className="flex min-h-[calc(100vh-68px)] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-bold text-foreground">
            Create account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Already have one?{" "}
            <Link
              href={`/auth/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

        <RegisterForm next={next} />
      </div>
    </div>
  );
}
