import { supabaseUrl } from "./supabase";

/**
 * A failed fetch surfaces only as "Network request failed", which says
 * nothing about which host the app tried. Name it, since a typo in
 * EXPO_PUBLIC_SUPABASE_URL is the usual cause.
 */
export function describeAuthError(message: string): string {
  const isNetwork = /network request failed|failed to fetch|networkerror/i.test(
    message,
  );
  if (!isNetwork) return message;
  return (
    `${message}\n\nCould not reach: ${supabaseUrl}\n\n` +
    "Check that URL is your project's (Supabase → Project Settings → Data API), " +
    "then restart with: npx expo start --clear"
  );
}
