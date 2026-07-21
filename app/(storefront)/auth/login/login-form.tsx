"use client";

import { useActionState, useState } from "react";
import { signIn, signInWithGoogle } from "@/actions/auth/customer";

interface Props {
  next?: string;
}

export function LoginForm({ next }: Props) {
  const [state, action, pending] = useActionState(signIn, { error: null });
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    try {
      setGoogleError(null);
      setGoogleLoading(true);
      const res = await signInWithGoogle(next);
      if (res?.error) {
        setGoogleError(res.error);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in with Google.";
      setGoogleError(message);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Google OAuth Button */}
      <button
        type="button"
        disabled={pending || googleLoading}
        onClick={handleGoogleSignIn}
        className="w-full flex items-center justify-center gap-3 rounded border border-border bg-white py-2.5 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted/50 disabled:opacity-50"
      >
        <svg className="size-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.13C3.26 21.3 7.31 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.6H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.4l3.99-3.13z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.6l3.99 3.13c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
        <span>{googleLoading ? "Connecting to Google…" : "Continue with Google"}</span>
      </button>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-border" />
        <span className="bg-background px-3 text-xs uppercase font-medium text-muted-foreground absolute">
          or sign in with email
        </span>
      </div>

      <form action={action} className="space-y-4 pt-2">
        {/* Hidden redirect target */}
        {next && <input type="hidden" name="next" value={next} />}

        {(state.error || googleError) && (
          <p className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {state.error || googleError}
          </p>
        )}

        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-foreground">
            Email address
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
          disabled={pending || googleLoading}
          className="w-full rounded bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in with Email"}
        </button>
      </form>
    </div>
  );
}
