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
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/theme";

/**
 * Create an account: a player name and an email, then the code emailed to
 * it. The account is created by the code request and named from it.
 */
export default function SignUp() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = username.trim();

  const send = async () => {
    const address = email.trim();
    if (!EMAIL.test(address)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setLoading(true);
    // A taken name would otherwise fail inside account creation, which
    // Supabase reports as a server error ("Server unresponsive").
    const { data: free, error: checkError } = await supabase.rpc(
      "username_available",
      { p_username: name },
    );
    if (!checkError && free === false) {
      setLoading(false);
      setError(`"${name}" is already taken. Pick another player name.`);
      return;
    }
    const problem = await sendCode(address, { username: name });
    setLoading(false);
    if (problem) setError(problem);
    else setSentTo(address);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAwareScroll centered contentContainerStyle={styles.form}>
        <Text style={styles.title}>Create account</Text>
        {sentTo ? (
          <CodeEntry
            email={sentTo}
            verifyLabel="Create Account"
            onResend={() => sendCode(sentTo, { username: name })}
            onChangeEmail={() => setSentTo(null)}
          />
        ) : (
          <>
            <Label>Player name</Label>
            <Input
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                setError(null);
              }}
              autoCapitalize="none"
              maxLength={24}
              placeholder="your player name"
            />
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
              disabled={name.length < 2 || !email.trim()}
            />
            <Text style={styles.hint}>
              We'll email you a code to confirm it's you. No password needed.
            </Text>
          </>
        )}
        <Link href="/sign-in" style={styles.link}>
          Already have an account? Sign in
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
    marginBottom: 12,
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
