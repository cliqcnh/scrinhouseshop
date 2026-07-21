"use client";

import { useActionState } from "react";
import { signUp } from "@/actions/auth/customer";

interface Props {
  next?: string;
}

export function RegisterForm({ next }: Props) {
  const [state, action, pending] = useActionState(signUp, { error: null });

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && (
        <p className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="reg-name" className="mb-1.5 block text-sm font-medium text-foreground">
          Full name
        </label>
        <input
          id="reg-name"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          className="w-full rounded border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Kofi Mensah"
        />
      </div>

      <div>
        <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="reg-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="reg-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Min. 8 characters"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        By creating an account you agree to our terms of service.
      </p>
    </form>
  );
}
