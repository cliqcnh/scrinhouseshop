"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { signInWithGoogle } from "@/actions/auth/customer";

interface Props {
  next?: string;
}

export function LoginForm({ next }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const destination = (next && next.startsWith("/") && !next.startsWith("//") && !next.includes(":"))
    ? next
    : "/account";

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      router.replace(destination);
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred during sign in.");
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setErrorMsg(null);
      setGoogleLoading(true);
      const supabase = createClient();

      // 1. Try native Supabase OAuth first
      const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
        },
      });

      if (oauthError) {
        // Fallback to custom Google OAuth flow
        const res = await signInWithGoogle(destination);
        if (res?.error) {
          setErrorMsg(res.error);
        }
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && ("digest" in err || "message" in err)) {
        const msg = String((err as Record<string, unknown>).digest || (err as Record<string, unknown>).message || "");
        if (msg.includes("NEXT_REDIRECT")) {
          throw err;
        }
      }
      const message = err instanceof Error ? err.message : "Failed to connect to Google.";
      setErrorMsg(message);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs font-semibold text-destructive animate-in fade-in duration-200">
          {errorMsg}
        </div>
      )}

      {/* Email & Password Form */}
      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9 text-sm rounded-xl h-11"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9 text-sm rounded-xl h-11"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full h-11 rounded-xl text-sm font-semibold shadow-md"
        >
          {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
          Sign in
        </Button>
      </form>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-border" />
        <span className="absolute bg-background px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Or continue with
        </span>
      </div>

      {/* Google OAuth Button */}
      <button
        type="button"
        disabled={loading || googleLoading}
        onClick={handleGoogleSignIn}
        className="w-full h-11 flex items-center justify-center gap-3 rounded-xl border border-border bg-background py-2.5 px-4 text-sm font-semibold text-foreground transition-all hover:bg-muted/50 disabled:opacity-50 shadow-sm"
      >
        {googleLoading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
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
        )}
        <span>{googleLoading ? "Connecting to Google…" : "Continue with Google"}</span>
      </button>
    </div>
  );
}
