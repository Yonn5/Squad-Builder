import { isAuthApiError } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Input,
  KeyboardAwareScroll,
  Label,
  Loading,
} from "../src/components/ui";
import { describeAuthError } from "../src/lib/authErrors";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/providers/AuthProvider";
import { colors } from "../src/theme";

/**
 * Where the reset email lands. AuthProvider has already signed the player in
 * with the link's tokens (or recorded why it couldn't); this screen only
 * collects the new password.
 */
export default function ResetPassword() {
  const router = useRouter();
  const { session, recovery, clearRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const requestNewLink = () => {
    clearRecovery();
    router.replace(session ? "/" : "/forgot-password");
  };

  const save = async () => {
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setError(null);
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      if (isAuthApiError(error) && error.code === "same_password") {
        setError("That's your current password. Pick a different one.");
      } else if (
        isAuthApiError(error) &&
        (error.status === 401 || error.status === 403 || error.code === "session_not_found")
      ) {
        setError("This reset link has expired. Send yourself a new one.");
      } else {
        setError(describeAuthError(error));
      }
      return;
    }
    setDone(true);
  };

  const finish = () => {
    clearRecovery();
    router.replace("/");
  };

  let content: React.ReactNode;
  if (recovery.status === "working") {
    content = <Loading />;
  } else if (recovery.status === "failed") {
    content = (
      <>
        <Text style={styles.body}>{recovery.message}</Text>
        <Button
          title={session ? "Back to the App" : "Send a New Link"}
          onPress={requestNewLink}
        />
      </>
    );
  } else if (!session) {
    content = (
      <>
        <Text style={styles.body}>
          Open this page from the link in your reset email.
        </Text>
        <Button title="Send a Reset Link" onPress={requestNewLink} />
      </>
    );
  } else if (done) {
    content = (
      <>
        <Text style={styles.body}>
          Password changed. Use it next time you sign in.
        </Text>
        <Button title="Continue" onPress={finish} />
      </>
    );
  } else {
    content = (
      <>
        <Text style={styles.body}>
          Choose a new password for {session.user.email}.
        </Text>
        <Label>New password</Label>
        <Input
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError(null);
          }}
          secureTextEntry
          placeholder="min 6 characters"
        />
        <Label>Repeat it</Label>
        <Input
          value={confirm}
          onChangeText={(text) => {
            setConfirm(text);
            setError(null);
          }}
          secureTextEntry
          placeholder="same again"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="Save Password"
          onPress={save}
          loading={saving}
          disabled={!password || !confirm}
        />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAwareScroll centered contentContainerStyle={styles.form}>
        <Text style={styles.title}>New password</Text>
        <View style={{ gap: 12 }}>{content}</View>
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
});
