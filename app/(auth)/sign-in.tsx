import { Link } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Input, Label } from "../../src/components/ui";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/theme";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) Alert.alert("Sign in failed", error.message);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.form}>
        <Text style={styles.title}>Squad Builder</Text>
        <Text style={styles.subtitle}>Build your card. Claim your spot.</Text>
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
          placeholder="••••••••"
        />
        <Button
          title="Sign In"
          onPress={signIn}
          loading={loading}
          disabled={!email || !password}
        />
        <Link href="/sign-up" style={styles.link}>
          New here? Create an account
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, justifyContent: "center" },
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
  link: {
    color: colors.accent,
    textAlign: "center",
    marginTop: 12,
    fontWeight: "600",
  },
});
