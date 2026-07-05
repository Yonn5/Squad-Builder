import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { playstyleCategory } from "../constants/playstyles";
import { getPlaystyleIcon } from "../constants/playstyleIcons";
import { categoryColors } from "../theme";

/**
 * Small shield-shaped badge for a PlayStyle+ icon, edged in its
 * category colour. Falls back to the style's initials if no icon
 * image is registered.
 */
export function PlaystyleBadge({
  name,
  size = 30,
}: {
  name: string;
  size?: number;
}) {
  const icon = getPlaystyleIcon(name);
  const category = playstyleCategory(name);
  const edge = category ? categoryColors[category] : "#888";

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size * 1.08,
          borderColor: edge,
          borderTopLeftRadius: size * 0.24,
          borderTopRightRadius: size * 0.24,
          borderBottomLeftRadius: size * 0.5,
          borderBottomRightRadius: size * 0.5,
        },
      ]}
    >
      {icon ? (
        <Image
          source={icon}
          style={{ width: size * 0.62, height: size * 0.62 }}
          resizeMode="contain"
        />
      ) : (
        <Text style={[styles.fallback, { fontSize: size * 0.34 }]}>
          {name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: "#141920",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  fallback: { color: "#fff", fontWeight: "800" },
});
