import {
  isAuthApiError,
  isAuthRetryableFetchError,
} from "@supabase/supabase-js";

const UNREACHABLE = "Server unresponsive, try again later.";
const BAD_LOGIN = "Incorrect login details.";

/**
 * Turns a Supabase auth error into one line a player can act on.
 *
 * The split between "wrong details" and "server problem" comes from the
 * error's type rather than its text: supabase-js raises
 * AuthRetryableFetchError when the request never got a usable response
 * (no connection, timeout, 5xx, rate limit) and AuthApiError when the
 * server answered and rejected the request.
 */
export function describeAuthError(error: unknown): string {
  if (isAuthRetryableFetchError(error)) return UNREACHABLE;

  if (isAuthApiError(error)) {
    const status = error.status ?? 0;
    if (status >= 500) return UNREACHABLE;

    switch (error.code) {
      case "invalid_credentials":
      case "invalid_grant":
        return BAD_LOGIN;
      case "email_not_confirmed":
        return "Confirm your email address first — check your inbox for the link.";
      case "user_already_exists":
      case "email_exists":
        return "That email already has an account. Try signing in instead.";
      case "weak_password":
        return "Password must be at least 6 characters.";
      case "validation_failed":
        return "Check the email address and try again.";
      case "signup_disabled":
        return "New accounts are turned off for this app.";
      case "over_request_rate_limit":
      case "over_email_send_rate_limit":
        return "Too many attempts. Wait a minute and try again.";
    }

    // Projects on older Auth versions answer without a code.
    if (/invalid login credentials/i.test(error.message)) return BAD_LOGIN;
    if (/email not confirmed/i.test(error.message))
      return "Confirm your email address first — check your inbox for the link.";
    if (/already registered|already been registered/i.test(error.message))
      return "That email already has an account. Try signing in instead.";
    if (/password should be at least/i.test(error.message))
      return "Password must be at least 6 characters.";
    if (status === 400 || status === 401) return BAD_LOGIN;
    if (status === 429) return "Too many attempts. Wait a minute and try again.";
  }

  // Anything that never reached the server at all.
  const message =
    error instanceof Error ? error.message : String(error ?? "");
  if (
    /failed to fetch|network request failed|networkerror|timed? ?out|aborted|ECONN/i.test(
      message,
    )
  ) {
    return UNREACHABLE;
  }

  return "Something went wrong. Please try again.";
}
