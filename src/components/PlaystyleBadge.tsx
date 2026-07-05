import React from "react";
import { Image, StyleSheet, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { getPlaystyleIcon } from "../constants/playstyleIcons";

/**
 * PlayStyle+ badge: white glyph centered on a dark diamond-shield,
 * FC-style. All icon PNGs are normalized white glyphs on transparency,
 * so every badge renders with an identical background.
 */
export function PlaystyleBadge({
  name,
  size = 30,
}: {
  name: string;
  size?: number;
}) {
  const icon = getPlaystyleIcon(name);
  const height = size * 1.06;

  return (
    <View style={{ width: size, height, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={height} viewBox="0 0 100 106" style={StyleSheet.absoluteFill}>
        <Polygon
          points="12,2 88,2 98,30 50,104 2,30"
          fill="#20242c"
          stroke="#c9cdd6"
          strokeWidth={5}
        />
      </Svg>
      {icon && (
        <Image
          source={icon}
          style={{ width: size * 0.58, height: size * 0.58, marginBottom: size * 0.16 }}
          resizeMode="contain"
        />
      )}
    </View>
  );
}
