import { Link } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Input,
  KeyboardAwareScroll,
  Label,
} from "../../src/components/ui";
import { showAlert } from "../../src/lib/alert";
import { describeAuthError } from "../../src/lib/authErrors";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/theme";

export default function SignUp() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signUp = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: username.trim() } },
    });
    setLoading(false);
    if (error) {
      showAlert("Sign up failed", describeAuthError(error.message));
    } else if (!data.session) {
      // Email confirmation is enabled on the Supabase project.
      showAlert(
        "Check your inbox",
        "Confirm your email address, then come back and sign in.",
      );
    }
    // With a session, the auth redirect takes over automatically.
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAwareScroll centered contentContainerStyle={styles.form}>
        <Text style={styles.title}>Create account</Text>
        <Label>Username</Label>
        <Input
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder="your player name"
        />
        <Label>Email</Label>
        <Input
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <Label>Password</Label>
        <Input
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="min 6 characters"
        />
        <Button
          title="Sign Up"
          onPress={signUp}
          loading={loading}
          disabled={username.trim().length < 2 || !email || password.length < 6}
        />
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
  link: {
    color: colors.accent,
    textAlign: "center",
    marginTop: 12,
    fontWeight: "600",
  },
});
