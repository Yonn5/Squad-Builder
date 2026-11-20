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
import { colors } from "../../src/theme";

export default function ForgotPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(
    typeof params.email === "string" ? params.email : "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const send = async () => {
    const address = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
      setError("Enter the email address you signed up with.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: resetPasswordRedirect(),
    });
    setLoading(false);
    if (error) {
      setError(describeAuthError(error));
      return;
    }
    setSentTo(address);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAwareScroll centered contentContainerStyle={styles.form}>
        <Text style={styles.title}>Reset password</Text>
        {sentTo ? (
          <>
            <Text style={styles.body}>
              If there is an account for {sentTo}, an email with a reset link
              is on its way.
            </Text>
            <Text style={styles.body}>
              Open the link on this device. It works once, and only for a
              short while. Nothing arrived? Check your spam folder, or send
              it again in a minute.
            </Text>
            <Button
              title="Send again"
              variant="secondary"
              onPress={send}
              loading={loading}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </>
        ) : (
          <>
            <Text style={styles.body}>
              Enter the email you signed up with and we'll send you a link to
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
              title="Send Reset Link"
              onPress={send}
              loading={loading}
              disabled={!email.trim()}
            />
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
