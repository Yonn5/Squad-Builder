import { supabaseUrl } from "./supabase";

/**
 * Turns a Supabase auth error into something worth showing a person.
 * A failed fetch names the host it tried, since a typo in
 * EXPO_PUBLIC_SUPABASE_URL is the usual cause and the raw message says
 * nothing useful.
 */
export function describeAuthError(message: string): string {
  if (/network request failed|failed to fetch|networkerror/i.test(message)) {
    return `Can't reach the server (${supabaseUrl}). Check your connection and that EXPO_PUBLIC_SUPABASE_URL is right.`;
  }
  if (/invalid login credentials/i.test(message)) {
    return "Incorrect email or password.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Confirm your email address first — check your inbox for the link.";
  }
  if (/user already registered|already been registered/i.test(message)) {
    return "That email already has an account. Try signing in instead.";
  }
  if (/password should be at least/i.test(message)) {
    return "Password must be at least 6 characters.";
  }
  if (/unable to validate email|invalid email/i.test(message)) {
    return "That doesn't look like a valid email address.";
  }
  if (/rate limit|too many requests/i.test(message)) {
    return "Too many attempts. Wait a moment and try again.";
  }
  return message;
}
