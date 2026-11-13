"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Handles OAuth implicit hash fragments (e.g. #access_token=... or #error=...)
 * when redirected to root or other storefront routes by Supabase.
 */
export function AuthHashHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    if (!hash || (!hash.includes("access_token") && !hash.includes("refresh_token"))) {
      return;
    }

    const supabase = createClient();

    // Listen for auth state change triggered when Supabase parses the hash
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED")) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        if (window.location.pathname === "/" || window.location.pathname.startsWith("/auth")) {
          window.location.href = "/account";
        }
      }
    });

    // Also directly verify session if already established
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        if (window.location.pathname === "/" || window.location.pathname.startsWith("/auth")) {
          window.location.href = "/account";
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
