"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/actions/auth/customer";

interface Props {
  next?: string;
}

export function LoginForm({ next }: Props) {
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
      {googleError && (
        <p className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive animate-in fade-in duration-200">
          {googleError}
        </p>
      )}

      {/* Google OAuth Button */}
      <button
        type="button"
        disabled={googleLoading}
        onClick={handleGoogleSignIn}
        className="w-full flex items-center justify-center gap-3 rounded border border-border bg-white py-3 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted/50 disabled:opacity-50 shadow-sm"
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
    </div>
  );
}
