import { Link } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CodeEntry } from "../../src/components/CodeEntry";
import {
  Button,
  Input,
  KeyboardAwareScroll,
  Label,
} from "../../src/components/ui";
import { EMAIL, sendCode } from "../../src/lib/emailCode";
import { colors } from "../../src/theme";

/** Sign in with a code emailed to you; there are no passwords. */
export default function SignIn() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const address = email.trim();
    if (!EMAIL.test(address)) {
      setError("Enter the email address you signed up with.");
      return;
    }
    setError(null);
    setLoading(true);
    const problem = await sendCode(address);
    setLoading(false);
    if (problem) setError(problem);
    else setSentTo(address);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAwareScroll centered contentContainerStyle={styles.form}>
        <Text style={styles.title}>Squad Builder</Text>
        <Text style={styles.subtitle}>Build your card. Claim your spot.</Text>
        {sentTo ? (
          <CodeEntry
            email={sentTo}
            verifyLabel="Sign In"
            onResend={() => sendCode(sentTo)}
            onChangeEmail={() => setSentTo(null)}
          />
        ) : (
          <>
            <Label>Email</Label>
            <Input
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="you@example.com"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              title="Send Code"
              onPress={send}
              loading={loading}
              disabled={!email.trim()}
            />
            <Text style={styles.hint}>
              We'll email you a code to sign in. No password needed.
            </Text>
          </>
        )}
        <Link href="/sign-up" style={styles.link}>
          New here? Create an account
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
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 20,
  },
  hint: { color: colors.textMuted, fontSize: 13, textAlign: "center" },
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
