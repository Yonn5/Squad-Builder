import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
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
import { calcOverall, STAT_KEYS, STAT_LABELS, tierFor } from "../logic/overall";
import { tierColors } from "../theme";
import type { Stats } from "../types";
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
 * FC-style player card: rating + position top-left, portrait silhouette,
 * PlayStyle+ badges down the left edge, centered name, one six-column
 * stat row (labels over values) and nationality at the bottom.
 */
export function PlayerCard({
  name,
  position,
  stats,
  playstyles,
  nationality,
  width = 280,
}: {
  name: string;
  position: Position;
  stats: Stats;
  playstyles: string[];
  nationality?: string;
  width?: number;
}) {
  const height = width * 1.3;
  const overall = calcOverall(stats, position);
  const tier = tierColors[tierFor(overall)];
  const s = width / 280; // typography scale
  const flag = flagFor(nationality);
  const uid = useMemo(() => `pc${cardInstance++}`, []);
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
        {/* portrait silhouette */}
        <Circle cx={162} cy={104} r={40} fill="rgba(60,40,5,0.16)" clipPath={`url(#${clipId})`} />
        <Path
          d="M94 208 Q162 148 230 208 L230 210 L94 210 Z"
          fill="rgba(60,40,5,0.16)"
          clipPath={`url(#${clipId})`}
        />
        {/* hairline above stats */}
        <Path d="M42 252 H238" stroke={tier.text} strokeWidth={0.8} opacity={0.35} />
      </Svg>

      {/* rating + position, top-left */}
      <View style={[styles.corner, { left: width * 0.1, top: height * 0.055 }]}>
        <Text style={[styles.overall, { color: tier.text, fontSize: 42 * s, lineHeight: 46 * s }]}>
          {overall}
        </Text>
        <Text style={[styles.position, { color: tier.text, fontSize: 17 * s }]}>{position}</Text>
      </View>

      {/* playstyle badges, left edge */}
      <View style={[styles.badges, { left: width * 0.075, top: height * 0.3 }]}>
        {playstyles.slice(0, 4).map((p) => (
          <PlaystyleBadge key={p} name={p} size={30 * s} />
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
        {STAT_KEYS.map((key) => (
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
