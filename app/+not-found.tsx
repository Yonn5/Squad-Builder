import { Redirect } from "expo-router";
import React from "react";

/**
 * Any address the app doesn't have (an old password-reset link, a typo)
 * goes home, which is the sign-in screen when signed out.
 */
export default function NotFound() {
  return <Redirect href="/" />;
}
