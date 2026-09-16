import React, { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  LinearGradient,
  Path,
  Polygon,
  Stop,
} from "react-native-svg";
import { flagFor } from "../constants/countries";
import type { Position } from "../constants/positions";
import {
  calcGkOverall,
  calcOverall,
  GK_STAT_KEYS,
  GK_STAT_LABELS,
  STAT_KEYS,
  STAT_LABELS,
  tierFor,
} from "../logic/overall";
import { tierColors } from "../theme";
import type { GkStats, Stats } from "../types";
import { PlaystyleBadge } from "./PlaystyleBadge";

// Subtle sunburst rays behind the portrait, clipped to the card shape.
// SVG defs ids are document-global on web, so each card needs its own.
let cardInstance = 0;

const RAYS = Array.from({ length: 12 }, (_, i) => {
  const a1 = (i * 30 * Math.PI) / 180;
  const a2 = ((i * 30 + 13) * Math.PI) / 180;
  const cx = 140, cy = 130, r = 260;
  return `${cx},${cy} ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)} ${cx + r * Math.cos(a2)},${cy + r * Math.sin(a2)}`;
});

/**
 * FC-style player card: rating + position top-left, the player's photo (or
 * a silhouette), PlayStyle+ badges down the left edge, centered name, one
 * six-column stat row (labels over values) and nationality at the bottom.
 */
export function PlayerCard({
  name,
  position,
  stats,
  gkStats,
  playstyles,
  nationality,
  photoUri,
  width = 280,
}: {
  name: string;
  position: Position;
  stats: Stats;
  gkStats?: GkStats;
  playstyles: string[];
  nationality?: string;
  photoUri?: string | null;
  width?: number;
}) {
  const height = width * 1.3;
  // Goalkeepers are rated on their own six stats, not the outfield ones.
  const isGk = position === "GK" && !!gkStats;
  const overall =
    isGk && gkStats ? calcGkOverall(gkStats) : calcOverall(stats, position);
  const tier = tierColors[tierFor(overall)];
  const s = width / 280; // typography scale
  const flag = flagFor(nationality);
  const uid = useMemo(() => `pc${cardInstance++}`, []);
  const photo = fitPhoto(usePhotoRatio(photoUri));
  const gradId = `${uid}-tier`;
  const clipId = `${uid}-card`;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox="0 0 280 364" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gradId} x1="0.2" y1="0" x2="0.75" y2="1">
            <Stop offset="0" stopColor={tier.gradient[0]} />
            <Stop offset="0.55" stopColor={tier.gradient[1]} />
            <Stop offset="1" stopColor={tier.gradient[2]} />
          </LinearGradient>
          <ClipPath id={clipId}>
            <Path d="M26 6 L254 6 Q274 6 274 26 L274 280 L148 356 Q140 361 132 356 L6 280 L6 26 Q6 6 26 6 Z" />
          </ClipPath>
        </Defs>
        <Path
          d="M26 6 L254 6 Q274 6 274 26 L274 280 L148 356 Q140 361 132 356 L6 280 L6 26 Q6 6 26 6 Z"
          fill={`url(#${gradId})`}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={2}
        />
        {RAYS.map((points, i) => (
          <Polygon key={i} points={points} fill="rgba(255,255,255,0.07)" clipPath={`url(#${clipId})`} />
        ))}
        {/* portrait silhouette, shown until the player adds a photo */}
        {!photoUri && (
          <>
            <Circle cx={162} cy={104} r={40} fill="rgba(60,40,5,0.16)" clipPath={`url(#${clipId})`} />
            <Path
              d="M94 208 Q162 148 230 208 L230 210 L94 210 Z"
              fill="rgba(60,40,5,0.16)"
              clipPath={`url(#${clipId})`}
            />
          </>
        )}
        {/* hairline above stats */}
        <Path d="M42 252 H238" stroke={tier.text} strokeWidth={0.8} opacity={0.35} />
      </Svg>

      {/* Player photo, centred on the card and standing on the name. */}
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          resizeMode="contain"
          style={{
            position: "absolute",
            left: (PHOTO_SLOT.centreX - photo.width / 2) * s,
            top: (PHOTO_SLOT.bottom - photo.height) * s,
            width: photo.width * s,
            height: photo.height * s,
          }}
        />
      ) : null}

      {/* rating + position, top-left */}
      <View style={[styles.corner, { left: width * 0.1, top: height * 0.055 }]}>
        <Text style={[styles.overall, { color: tier.text, fontSize: 42 * s, lineHeight: 46 * s }]}>
          {overall}
        </Text>
        <Text style={[styles.position, { color: tier.text, fontSize: 17 * s }]}>{position}</Text>
      </View>

      {/* playstyle badges straddling the card's left edge (edge at x=6/280) */}
      <View
        style={[
          styles.badges,
          { left: width * (6 / 280) - 16 * s, top: height * 0.3 },
        ]}
      >
        {playstyles.slice(0, 4).map((p) => (
          <PlaystyleBadge key={p} name={p} size={32 * s} />
        ))}
      </View>

      {/* name */}
      <View style={[styles.nameWrap, { top: height * 0.575 }]}>
        <Text numberOfLines={1} style={[styles.name, { color: tier.text, fontSize: 23 * s }]}>
          {name || "Player"}
        </Text>
      </View>

      {/* stats: one row of six, labels above values */}
      <View style={[styles.statsWrap, { top: height * 0.72, paddingHorizontal: width * 0.115 }]}>
        {isGk && gkStats
          ? GK_STAT_KEYS.map((key) => (
              <View key={key} style={styles.stat}>
                <Text style={[styles.statLabel, { color: tier.text, fontSize: 10.5 * s }]}>
                  {GK_STAT_LABELS[key]}
                </Text>
                <Text style={[styles.statValue, { color: tier.text, fontSize: 17 * s }]}>
                  {gkStats[key]}
                </Text>
              </View>
            ))
          : STAT_KEYS.map((key) => (
              <View key={key} style={styles.stat}>
                <Text style={[styles.statLabel, { color: tier.text, fontSize: 10.5 * s }]}>
                  {STAT_LABELS[key]}
                </Text>
                <Text style={[styles.statValue, { color: tier.text, fontSize: 17 * s }]}>
                  {stats[key]}
                </Text>
              </View>
            ))}
      </View>

      {/* nationality */}
      {flag && (
        <View style={[styles.flagWrap, { top: height * 0.845 }]}>
          <Text style={{ fontSize: 20 * s }}>{flag}</Text>
        </View>
      )}
    </View>
  );
}

/**
 * The photo slot, in viewBox units. Centred on the card's own axis, like the
 * name and the stats row, and standing on top of the name rather than
 * floating above it: a photo is fitted to the slot and then pushed down to
 * `bottom`, so the gap under it is the same whatever shape the photo is.
 */
const PHOTO_SLOT = { centreX: 140, bottom: 208, maxWidth: 230, maxHeight: 182 };

/**
 * The corner the rating and position sit in. A photo that still has its
 * background is a plain rectangle, and running one under the number reads as
 * a mistake, so photos are kept out of this corner.
 */
const RATING_CORNER = { right: 78, bottom: 90 };

/**
 * The photo at its own shape, as large as it fits without reaching into the
 * rating's corner.
 *
 * Only a photo both wide enough to reach past the rating and tall enough to
 * rise beside it actually collides, so it is shrunk by whichever of those
 * two limits costs less. That leaves a tall photo its full height and a wide
 * one most of its width; only a square gives up much.
 */
function fitPhoto(ratio: number | null) {
  const { centreX, bottom, maxWidth, maxHeight } = PHOTO_SLOT;
  if (!ratio) return { width: maxWidth, height: maxHeight };

  let width: number;
  let height: number;
  if (ratio > maxWidth / maxHeight) {
    width = maxWidth;
    height = maxWidth / ratio;
  } else {
    height = maxHeight;
    width = maxHeight * ratio;
  }

  const clearWidth = (centreX - RATING_CORNER.right) * 2;
  const clearHeight = bottom - RATING_CORNER.bottom;
  if (width > clearWidth && height > clearHeight) {
    const scale = Math.max(clearWidth / width, clearHeight / height);
    width *= scale;
    height *= scale;
  }
  return { width, height };
}

/**
 * The photo's own width-to-height ratio, so it can be sized to the slot and
 * then stood on the name. `resizeMode="contain"` alone would centre it in the
 * slot, leaving a different gap above the name for every photo shape.
 */
function usePhotoRatio(uri?: string | null): number | null {
  const [ratio, setRatio] = useState<number | null>(null);

  useEffect(() => {
    setRatio(null);
    if (!uri) return;
    let current = true;
    Image.getSize(
      uri,
      (width, height) => {
        if (current && height > 0) setRatio(width / height);
      },
      () => {},
    );
    return () => {
      current = false;
    };
  }, [uri]);

  return ratio;
}

const styles = StyleSheet.create({
  corner: { position: "absolute", alignItems: "center" },
  overall: { fontWeight: "800" },
  position: { fontWeight: "700", letterSpacing: 1, marginTop: -2 },
  badges: { position: "absolute", gap: 4 },
  nameWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  name: { fontWeight: "800", letterSpacing: 0.8, maxWidth: "72%" },
  statsWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stat: { alignItems: "center", minWidth: 34 },
  statLabel: { fontWeight: "700", opacity: 0.75, letterSpacing: 0.4 },
  statValue: { fontWeight: "800", marginTop: 1 },
  flagWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
});
