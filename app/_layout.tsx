import { Asset } from "expo-asset";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { View } from "react-native";
import { Loading } from "../src/components/ui";
import { ICON_IMAGES } from "../src/constants/playstyleIcons";
import { applyWebViewportFixes } from "../src/lib/webViewport";
import { AuthProvider, useAuth } from "../src/providers/AuthProvider";
import { colors } from "../src/theme";

function RootNavigator() {
  const { session, loading } = useAuth();
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
    Asset.loadAsync(Object.values(ICON_IMAGES) as number[]).catch(() => {});
    applyWebViewportFixes();
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  );
}
