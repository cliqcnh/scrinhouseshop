"use client";

import { useActionState } from "react";
import { signIn } from "@/actions/auth/customer";

interface Props {
  next?: string;
}

export function LoginForm({ next }: Props) {
  const [state, action, pending] = useActionState(signIn, { error: null });

  return (
    <form action={action} className="space-y-4">
      {/* Hidden redirect target */}
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && (
        <p className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
