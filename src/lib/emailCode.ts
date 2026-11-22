import { isAuthApiError } from "@supabase/supabase-js";
import { describeAuthError } from "./authErrors";
import { signInRedirect } from "./authLinks";
import { supabase } from "./supabase";

/**
 * Signing in without a password: Supabase emails a one-time code (and a
 * link that does the same on the device that asked), and the code typed
 * into the app signs the player in.
 *
 * The code only appears in the email if the project's "Magic Link" and
 * "Confirm signup" templates include {{ .Token }} (supabase/email-templates).
 */

export const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Supabase lets each address ask for a new code once a minute. */
export const RESEND_SECONDS = 60;

/**
 * Emails a sign-in code. With `newPlayer`, an account is created for an
 * address that has none, named after them; without, an unknown address is
 * refused (so a typo doesn't quietly create a second account).
 */
export async function sendCode(
  email: string,
  newPlayer?: { username: string },
): Promise<string | null> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      shouldCreateUser: !!newPlayer,
      data: newPlayer ? { username: newPlayer.username } : undefined,
      emailRedirectTo: signInRedirect(),
    },
  });
  if (!error) return null;
  if (
    isAuthApiError(error) &&
    (error.code === "otp_disabled" || /signups? not allowed/i.test(error.message))
  ) {
    return "There's no account with that email yet. Create one instead.";
  }
  return describeAuthError(error);
}

/** Checks the code; on success the player is signed in. */
export async function verifyCode(email: string, code: string): Promise<string | null> {
  const token = code.replace(/\s+/g, "");
  if (!/^\d{6,10}$/.test(token)) return "Enter the code from the email: just the digits.";
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token,
    type: "email",
  });
  if (!error) return null;
  const status = isAuthApiError(error) ? (error.status ?? 0) : 0;
  if (isAuthApiError(error) && status !== 429 && status < 500) {
    return "That code is wrong, expired or already used. Check it, or send a new one.";
  }
  return describeAuthError(error);
}
