import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import type { Position } from "../constants/positions";
import { calcOverall, STAT_KEYS, STAT_LABELS, tierFor } from "../logic/overall";
import { tierColors } from "../theme";
import type { Stats } from "../types";
import { PlaystyleBadge } from "./PlaystyleBadge";

/**
 * FC-style player card: original diamond-shield shape with a tier
 * gradient (bronze / silver / gold) and up to 4 PlayStyle+ badges
 * down the left edge.
 */
export function PlayerCard({
  name,
  position,
  stats,
  playstyles,
  width = 280,
}: {
  name: string;
  position: Position;
  stats: Stats;
  playstyles: string[];
  width?: number;
}) {
  const height = width * 1.4;
  const overall = calcOverall(stats, position);
  const tier = tierFor(overall);
  const palette = tierColors[tier];
  const s = width / 280; // scale factor for typography

  return (
    <View style={{ width, height }}>
      <Svg
        width={width}
        height={height}
        viewBox="0 0 280 392"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id="tier" x1="0" y1="0" x2="0.6" y2="1">
            <Stop offset="0" stopColor={palette.gradient[0]} />
            <Stop offset="0.55" stopColor={palette.gradient[1]} />
            <Stop offset="1" stopColor={palette.gradient[2]} />
          </LinearGradient>
        </Defs>
        {/* diamond-shield outline */}
        <Path
          d="M140 6 L264 40 L264 276 L140 386 L16 276 L16 40 Z"
          fill="url(#tier)"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth={2}
        />
        <Path
          d="M140 16 L254 47 L254 271 L140 373 L26 271 L26 47 Z"
          fill="none"
          stroke="rgba(0,0,0,0.18)"
          strokeWidth={1.5}
        />
      </Svg>

      {/* rating + position */}
      <View style={[styles.corner, { left: width * 0.13, top: height * 0.1 }]}>
        <Text style={[styles.overall, { color: palette.text, fontSize: 44 * s }]}>
          {overall}
        </Text>
        <Text style={[styles.position, { color: palette.text, fontSize: 17 * s }]}>
          {position}
        </Text>
      </View>

      {/* playstyle badges down the left edge */}
      <View style={[styles.badges, { left: width * 0.115, top: height * 0.3 }]}>
        {playstyles.slice(0, 4).map((p) => (
          <PlaystyleBadge key={p} name={p} size={26 * s} />
        ))}
      </View>

      {/* name */}
      <View style={[styles.nameWrap, { top: height * 0.52 }]}>
        <Text
          numberOfLines={1}
          style={[styles.name, { color: palette.text, fontSize: 21 * s }]}
        >
          {name.toUpperCase() || "PLAYER"}
        </Text>
        <View
          style={[styles.divider, { backgroundColor: palette.text, width: width * 0.6 }]}
        />
      </View>

      {/* stats: two rows of three */}
      <View style={[styles.statsWrap, { top: height * 0.63, paddingHorizontal: width * 0.16 }]}>
        {[STAT_KEYS.slice(0, 3), STAT_KEYS.slice(3)].map((row, i) => (
          <View key={i} style={styles.statRow}>
            {row.map((key) => (
              <View key={key} style={styles.stat}>
                <Text style={[styles.statValue, { color: palette.text, fontSize: 17 * s }]}>
                  {stats[key]}
                </Text>
                <Text style={[styles.statLabel, { color: palette.text, fontSize: 11 * s }]}>
                  {STAT_LABELS[key]}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* tier tag near the point */}
      <View style={[styles.tierWrap, { top: height * 0.855 }]}>
        <Text style={[styles.tier, { color: palette.text, fontSize: 10 * s }]}>
          {palette.label.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  corner: { position: "absolute", alignItems: "center" },
  overall: { fontWeight: "800", lineHeight: 46 },
  position: { fontWeight: "700", letterSpacing: 1 },
  badges: { position: "absolute", gap: 5 },
  nameWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  name: { fontWeight: "800", letterSpacing: 1.2, maxWidth: "70%" },
  divider: { height: 1, opacity: 0.4, marginTop: 4 },
  statsWrap: { position: "absolute", left: 0, right: 0, gap: 6 },
  statRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { alignItems: "center", width: 52 },
  statValue: { fontWeight: "800" },
  statLabel: { fontWeight: "600", opacity: 0.75, letterSpacing: 0.5 },
  tierWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  tier: { fontWeight: "700", letterSpacing: 2, opacity: 0.7 },
});
