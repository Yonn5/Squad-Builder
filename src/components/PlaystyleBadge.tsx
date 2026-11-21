import React from "react";
import { Image } from "react-native";
import { getPlaystyleIcon } from "../constants/playstyleIcons";
import type { CardTier } from "../logic/overall";

/**
 * PlayStyle+ badge. The icon PNGs are the original gold diamond art,
 * cropped to the diamond silhouette with a slim white outline baked in,
 * so the badge is just the image. Silver and bronze cards get recoloured
 * copies (scripts/recolor-playstyles.js) so the badges match the card.
 */
export function PlaystyleBadge({
  name,
  size = 30,
  tier = "gold",
}: {
  name: string;
  size?: number;
  tier?: CardTier;
}) {
  const icon = getPlaystyleIcon(name, tier);
  if (!icon) return null;
  return (
    <Image
      source={icon}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}
