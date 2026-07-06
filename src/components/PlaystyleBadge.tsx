import React from "react";
import { Image } from "react-native";
import { getPlaystyleIcon } from "../constants/playstyleIcons";

/**
 * PlayStyle+ badge. The icon PNGs are the original gold diamond art,
 * cropped to the diamond silhouette with a slim white outline baked in,
 * so the badge is just the image.
 */
export function PlaystyleBadge({
  name,
  size = 30,
}: {
  name: string;
  size?: number;
}) {
  const icon = getPlaystyleIcon(name);
  if (!icon) return null;
  return (
    <Image
      source={icon}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}
