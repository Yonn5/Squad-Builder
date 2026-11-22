import { Asset } from "expo-asset";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { View } from "react-native";
import { DialogHost } from "../src/components/DialogHost";
import { Loading } from "../src/components/ui";
import { showAlert } from "../src/lib/alert";
import { ALL_ICON_IMAGES } from "../src/constants/playstyleIcons";
import { silenceHandledNetworkLogs } from "../src/lib/quietNetworkLogs";
import { applyWebViewportFixes } from "../src/lib/webViewport";
import { AuthProvider, useAuth } from "../src/providers/AuthProvider";
import { colors } from "../src/theme";

// Installed at module scope: the session check fires before any effect
// runs, and its failure is what logs first.
silenceHandledNetworkLogs();

function RootNavigator() {
  const { session, loading, linkError, clearLinkError } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) {
      router.replace("/sign-in");
    } else if (session && inAuthGroup) {
      router.replace("/");
    }
  }, [session, loading, segments, router]);

  // A sign-in link from an email that had expired or was already used.
  useEffect(() => {
    if (!linkError) return;
    showAlert("Sign-in link", linkError);
    clearLinkError();
  }, [linkError, clearLinkError]);

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
      <DialogHost />
    </AuthProvider>
  );
}
