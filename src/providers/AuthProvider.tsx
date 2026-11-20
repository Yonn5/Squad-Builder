import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  clearUrlTokens,
  describeLinkError,
  initialUrl,
  parseAuthLink,
} from "../lib/authLinks";
import { supabase } from "../lib/supabase";

/**
 * Where a password-reset link has got to:
 *   idle     no link opened
 *   working  signing in with the link
 *   ready    signed in from the link; the player now picks a new password
 *   failed   the link was expired, used or broken (message says which)
 */
export type Recovery =
  | { status: "idle" }
  | { status: "working" }
  | { status: "ready" }
  | { status: "failed"; message: string };

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  recovery: Recovery;
  clearRecovery: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
  recovery: { status: "idle" },
  clearRecovery: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState<Recovery>({ status: "idle" });

  /** Signs in with the tokens on a reset link, if the URL carries one. */
  const openLink = useCallback(async (url: string | null) => {
    const link = parseAuthLink(url);
    if (!link) return;
    clearUrlTokens();
    if (link.errorCode || !link.accessToken || !link.refreshToken) {
      setRecovery({ status: "failed", message: describeLinkError(link) });
      return;
    }
    setRecovery({ status: "working" });
    const { error } = await supabase.auth.setSession({
      access_token: link.accessToken,
      refresh_token: link.refreshToken,
    });
    setRecovery(
      error
        ? { status: "failed", message: describeLinkError({ errorCode: "otp_expired" }) }
        : { status: "ready" },
    );
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    // A reset link that opened the app is used before anything else, so the
    // sign-in screen never flashes up in between.
    (async () => {
      try {
        await openLink(await initialUrl());
      } catch {
        // fall through to whatever session is stored
      }
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    })();
    // A link tapped while the app is already open.
    const links = Linking.addEventListener("url", ({ url }) => {
      openLink(url);
    });
    return () => {
      sub.subscription.unsubscribe();
      links.remove();
    };
  }, [openLink]);

  const clearRecovery = useCallback(() => setRecovery({ status: "idle" }), []);

  return (
    <AuthContext.Provider value={{ session, loading, recovery, clearRecovery }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Convenience: current user id (only call under an authenticated route). */
export function useUserId(): string {
  const { session } = useAuth();
  return session?.user.id ?? "";
}
