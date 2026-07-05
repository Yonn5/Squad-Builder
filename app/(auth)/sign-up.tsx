import { Link } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Input, Label } from "../../src/components/ui";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/theme";

export default function SignUp() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: username.trim() } },
    });
    setLoading(false);
    if (error) {
      Alert.alert("Sign up failed", error.message);
    } else {
      Alert.alert(
        "Almost there",
        "If email confirmation is enabled for your Supabase project, check your inbox before signing in.",
      );
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.form}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, justifyContent: "center" },
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
