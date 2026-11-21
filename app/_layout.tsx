import { Asset } from "expo-asset";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { View } from "react-native";
import { Loading } from "../src/components/ui";
import { ALL_ICON_IMAGES } from "../src/constants/playstyleIcons";
import { silenceHandledNetworkLogs } from "../src/lib/quietNetworkLogs";
import { applyWebViewportFixes } from "../src/lib/webViewport";
import { AuthProvider, useAuth } from "../src/providers/AuthProvider";
import { colors } from "../src/theme";

// Installed at module scope: the session check fires before any effect
// runs, and its failure is what logs first.
silenceHandledNetworkLogs();

function RootNavigator() {
  const { session, loading, recovery } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const onResetScreen = segments[0] === "reset-password";
    // A reset link always ends up on the new-password screen, even when
    // Supabase sent it to the home page instead.
    if (recovery.status !== "idle") {
      if (!onResetScreen) router.replace("/reset-password");
      return;
    }
    if (onResetScreen) return; // open whether signed in or not
    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) {
      router.replace("/sign-in");
    } else if (session && inAuthGroup && (segments as string[])[1] !== "forgot-password") {
      // (Entering a reset code signs the player in a moment before the
      // new-password screen is opened, so that screen is left alone.)
      router.replace("/");
    }
  }, [session, loading, recovery.status, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Loading />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}

export default function RootLayout() {
  // In development the PlayStyle+ PNGs are fetched from the Metro server on
  // first display, so badges can pop in seconds after a card renders. Warm
  // them once at startup so they are cached before any card is shown.
  useEffect(() => {
    Asset.loadAsync(ALL_ICON_IMAGES as number[]).catch(() => {});
    applyWebViewportFixes();
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  );
}
