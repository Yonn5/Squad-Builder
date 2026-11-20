import * as Linking from "expo-linking";
import { Platform } from "react-native";

/**
 * Where the reset email sends people back to:
 *   web:       http(s)://<this site>/reset-password
 *   Expo Go:   exp://<computer's address>:8081/--/reset-password
 *   app build: squadbuilder://reset-password
 * Each one has to be listed under Supabase → Authentication → URL
 * Configuration → Redirect URLs, or Supabase sends people to the Site URL
 * instead.
 */
export function resetPasswordRedirect(): string {
  return Linking.createURL("/reset-password");
}

export type AuthLink = {
  accessToken?: string;
  refreshToken?: string;
  /** "recovery" for a password reset. */
  type?: string;
  /** Present instead of tokens when the link was expired or already used. */
  errorCode?: string;
  errorDescription?: string;
};

/**
 * Reads what Supabase put on the end of the link it redirected to. Tokens
 * and errors arrive after the `#`; some errors arrive in the `?` part.
 * Returns null for any other link.
 */
export function parseAuthLink(url: string | null | undefined): AuthLink | null {
  if (!url) return null;
  const hashAt = url.indexOf("#");
  const queryAt = url.indexOf("?");
  const query =
    queryAt >= 0 ? url.slice(queryAt + 1, hashAt > queryAt ? hashAt : undefined) : "";
  const hash = hashAt >= 0 ? url.slice(hashAt + 1) : "";
  const params = new URLSearchParams(query);
  new URLSearchParams(hash).forEach((value, key) => params.set(key, value));

  const link: AuthLink = {
    accessToken: params.get("access_token") ?? undefined,
    refreshToken: params.get("refresh_token") ?? undefined,
    type: params.get("type") ?? undefined,
    errorCode: params.get("error_code") ?? params.get("error") ?? undefined,
    errorDescription: params.get("error_description") ?? undefined,
  };
  if (!(link.accessToken && link.refreshToken) && !link.errorCode) return null;
  return link;
}

/** One line for a link that could not be used. */
export function describeLinkError(link: AuthLink): string {
  if (link.errorCode === "otp_expired") {
    return "This reset link has expired or was already used. Send yourself a new one.";
  }
  return link.errorDescription
    ? `${link.errorDescription.replace(/\+/g, " ")}. Send yourself a new link.`
    : "This link could not be used. Send yourself a new one.";
}

/** The link that opened the app (web: the page address). */
export async function initialUrl(): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof window === "undefined" ? null : window.location.href;
  }
  return Linking.getInitialURL();
}

/** Drops the tokens from the address bar once they have been used. */
export function clearUrlTokens() {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  window.history.replaceState(window.history.state, "", window.location.pathname);
}
