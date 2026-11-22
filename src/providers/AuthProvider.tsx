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

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  /** Why a sign-in link from an email could not be used, if it couldn't. */
  linkError: string | null;
  clearLinkError: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
  linkError: null,
  clearLinkError: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);

  /**
   * Signing in is by a code typed into the app, but the email also carries
   * a link: opened on the same device, it signs the player in directly.
   */
  const openLink = useCallback(async (url: string | null) => {
    const link = parseAuthLink(url);
    if (!link) return;
    clearUrlTokens();
    if (link.errorCode || !link.accessToken || !link.refreshToken) {
      setLinkError(describeLinkError(link));
      return;
    }
    const { error } = await supabase.auth.setSession({
      access_token: link.accessToken,
      refresh_token: link.refreshToken,
    });
    if (error) setLinkError(describeLinkError({ errorCode: "otp_expired" }));
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    // A link that opened the app is used before anything else, so the
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

  const clearLinkError = useCallback(() => setLinkError(null), []);

  return (
    <AuthContext.Provider value={{ session, loading, linkError, clearLinkError }}>
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
