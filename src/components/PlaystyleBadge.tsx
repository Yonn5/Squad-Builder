import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { playstyleCategory } from "../constants/playstyles";
import { getPlaystyleIcon } from "../constants/playstyleIcons";
import { categoryColors } from "../theme";

/**
 * PlayStyle+ badge. The icon art already includes the diamond-shield
 * badge shape, so it renders plain; the drawn shield is only the
 * fallback for styles without a registered icon.
 */
export function PlaystyleBadge({
  name,
  size = 30,
}: {
  name: string;
  size?: number;
}) {
  const icon = getPlaystyleIcon(name);

  if (icon) {
    return (
      <Image
        source={icon}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    );
  }

  const category = playstyleCategory(name);
  const edge = category ? categoryColors[category] : "#888";
  return (
    <View
      style={[
        styles.fallbackBadge,
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
      <Text style={[styles.fallbackText, { fontSize: size * 0.34 }]}>
        {name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackBadge: {
    backgroundColor: "#141920",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: { color: "#fff", fontWeight: "800" },
});
