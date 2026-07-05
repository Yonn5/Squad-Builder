import { Stack } from "expo-router";
import React from "react";
import { colors } from "../../../src/theme";

export default function FixturesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Fixtures" }} />
      <Stack.Screen name="new" options={{ title: "Schedule Match" }} />
      <Stack.Screen name="[id]" options={{ title: "Match" }} />
    </Stack>
  );
}
