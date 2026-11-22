import React, { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { RESEND_SECONDS, verifyCode } from "../lib/emailCode";
import { colors } from "../theme";
import { Button, Input, Label } from "./ui";

/**
 * The second step of signing in or up: type the code that was emailed.
 * Signing in happens inside verifyCode; the root layout then opens the app.
 */
export function CodeEntry({
  email,
  verifyLabel,
  onResend,
  onChangeEmail,
}: {
  email: string;
  verifyLabel: string;
  /** Sends a new code; returns an error message, or null when sent. */
  onResend: () => Promise<string | null>;
  onChangeEmail: () => void;
}) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(RESEND_SECONDS);

  // Supabase only sends a new code once a minute, so count it down.
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const verify = async () => {
    setError(null);
    setChecking(true);
    const problem = await verifyCode(email, code);
    setChecking(false);
    if (problem) setError(problem);
  };

  const resend = async () => {
    setError(null);
    setSending(true);
    const problem = await onResend();
    setSending(false);
    if (problem) setError(problem);
    else {
      setCode("");
      setWait(RESEND_SECONDS);
    }
  };

  return (
    <>
      <Text style={styles.body}>
        We sent a code to {email}. Type it below. You can read the email on
        any device.
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
        title={verifyLabel}
        onPress={verify}
        loading={checking}
        disabled={!code.trim()}
      />
      <Button
        title={wait > 0 ? `Send a New Code (${wait}s)` : "Send a New Code"}
        variant="secondary"
        onPress={resend}
        loading={sending}
        disabled={wait > 0}
      />
      <Text style={styles.hint}>
        Nothing arrived? Check your spam folder.{" "}
        <Text style={styles.link} onPress={onChangeEmail}>
          Use a different email
        </Text>
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  body: { color: colors.textMuted, lineHeight: 21, textAlign: "center" },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  link: { color: colors.accent, fontWeight: "600" },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
});
