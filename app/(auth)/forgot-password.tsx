import { isAuthApiError } from "@supabase/supabase-js";
import { Link, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Input,
  KeyboardAwareScroll,
  Label,
} from "../../src/components/ui";
import { resetPasswordRedirect } from "../../src/lib/authLinks";
import { describeAuthError } from "../../src/lib/authErrors";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/providers/AuthProvider";
import { colors } from "../../src/theme";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Step 1: ask Supabase to email a reset code and link.
 * Step 2: type the code, on any device. The link only works on the device
 * that asked, because it points back at this app's own address.
 */
export default function ForgotPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { startRecovery } = useAuth();
  const [email, setEmail] = useState(
    typeof params.email === "string" ? params.email : "",
  );
  const [step, setStep] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const address = email.trim();

  const send = async () => {
    if (!EMAIL.test(address)) {
      setError("Enter the email address you signed up with.");
      return;
    }
    setError(null);
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: resetPasswordRedirect(),
    });
    setSending(false);
    if (error) {
      setError(describeAuthError(error));
      return;
    }
    setCode("");
    setStep("code");
    setNotice(
      `If there is an account for ${address}, an email with a reset code is on its way.`,
    );
  };

  const haveCode = () => {
    if (!EMAIL.test(address)) {
      setError("Enter the email address the code was sent to.");
      return;
    }
    setError(null);
    setNotice(null);
    setStep("code");
  };

  const verify = async () => {
    const token = code.replace(/\s+/g, "");
    if (!/^\d{6,10}$/.test(token)) {
      setError("Enter the code from the email: just the digits.");
      return;
    }
    setError(null);
    setChecking(true);
    const { error } = await supabase.auth.verifyOtp({
      email: address,
      token,
      type: "recovery",
    });
    setChecking(false);
    if (error) {
      const status = isAuthApiError(error) ? (error.status ?? 0) : 0;
      setError(
        status === 429 || status >= 500 || !isAuthApiError(error)
          ? describeAuthError(error)
          : "That code is wrong, expired or already used. Check it, or send a new one.",
      );
      return;
    }
    // Signed in with the code; the root layout now opens the new-password
    // screen.
    startRecovery();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAwareScroll centered contentContainerStyle={styles.form}>
        <Text style={styles.title}>Reset password</Text>
        {step === "email" ? (
          <>
            <Text style={styles.body}>
              Enter the email you signed up with and we'll send you a code to
              choose a new password.
            </Text>
            <Label>Email</Label>
            <Input
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              title="Send Reset Code"
              onPress={send}
              loading={sending}
              disabled={!address}
            />
            <Text style={styles.link} onPress={haveCode}>
              I already have a code
            </Text>
          </>
        ) : (
          <>
            {notice ? <Text style={styles.body}>{notice}</Text> : null}
            <Text style={styles.body}>
              Type the code from the email below. You can read the email on
              any device, such as your phone, and type the code here.
            </Text>
            <Label>Code</Label>
            <Input
              value={code}
              onChangeText={(text) => {
                setCode(text);
                setError(null);
              }}
              keyboardType="number-pad"
              autoCapitalize="none"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={12}
              placeholder="123456"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              title="Verify Code"
              onPress={verify}
              loading={checking}
              disabled={!code.trim()}
            />
            <Button
              title="Send a New Code"
              variant="secondary"
              onPress={send}
              loading={sending}
            />
            <Text style={styles.hint}>
              Code sent to {address}.{" "}
              <Text
                style={styles.inlineLink}
                onPress={() => {
                  setStep("email");
                  setError(null);
                  setNotice(null);
                }}
              >
                Use a different email
              </Text>
            </Text>
          </>
        )}
        <Link href="/sign-in" style={styles.link}>
          Back to sign in
        </Link>
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  form: { padding: 24, gap: 12 },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  body: { color: colors.textMuted, lineHeight: 21, textAlign: "center" },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  inlineLink: { color: colors.accent, fontWeight: "600" },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  link: {
    color: colors.accent,
    textAlign: "center",
    marginTop: 12,
    fontWeight: "600",
  },
});
