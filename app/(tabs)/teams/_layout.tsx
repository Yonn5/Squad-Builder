import { Stack } from "expo-router";
import React from "react";
import { colors } from "../../../src/theme";

export default function TeamsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Teams" }} />
      <Stack.Screen name="[id]/index" options={{ title: "Team" }} />
      <Stack.Screen name="[id]/lineups/[lineupId]" options={{ title: "Lineup" }} />
    </Stack>
  );
}
