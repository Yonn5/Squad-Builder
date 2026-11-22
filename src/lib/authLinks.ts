import * as Linking from "expo-linking";
import { Platform } from "react-native";

/**
 * Where the link in a sign-in email sends people back to (typing the code
 * is the main way in; the link is a shortcut on the same device):
 *   web:       http(s)://<this site>/
 *   Expo Go:   exp://<computer's address>:8081/--/
 *   app build: squadbuilder://
 * Each one has to be listed under Supabase → Authentication → URL
 * Configuration → Redirect URLs, or Supabase sends people to the Site URL
 * instead.
 */
export function signInRedirect(): string {
  // On the web createURL drops the trailing slash, and the allow-list entry
  // "http://localhost:8081/**" only matches with it.
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/`;
  }
  return Linking.createURL("/");
}

export type AuthLink = {
  accessToken?: string;
  refreshToken?: string;
  /** "magiclink" or "signup". */
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
    return "That sign-in link has expired or was already used. Ask for a new code.";
  }
  return link.errorDescription
    ? `${link.errorDescription.replace(/\+/g, " ")}. Ask for a new code.`
    : "That sign-in link could not be used. Ask for a new code.";
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
