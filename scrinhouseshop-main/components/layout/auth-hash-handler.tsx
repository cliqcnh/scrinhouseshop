"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Handles OAuth implicit hash fragments (e.g. #access_token=... or #error=...)
 * when redirected to root or other client routes by Supabase.
 */
export function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    if (!hash) return;

    if (hash.includes("access_token=") || hash.includes("refresh_token=")) {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (session && !error) {
          // Clean the hash fragment from the URL bar without reloading
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          // If on root or auth pages, redirect to account dashboard
          if (window.location.pathname === "/" || window.location.pathname.startsWith("/auth")) {
            router.push("/account");
            router.refresh();
          }
        }
      });
    }
  }, [router]);

  return null;
}
