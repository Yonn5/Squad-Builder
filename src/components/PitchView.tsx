import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Formation } from "../constants/formations";
import type { LineupChemistry } from "../logic/chemistry";
import { overallFor } from "../logic/overall";
import { colors } from "../theme";
import type { LineupSlot, Profile } from "../types";

/**
 * Renders a formation on a pitch. Own goal is at the bottom.
 * Tapping a slot lets a player claim it (handled by the parent).
 */
export function PitchView({
  formation,
  slots,
  profiles,
  chemistry,
  onSlotPress,
}: {
  formation: Formation;
  slots: LineupSlot[];
  profiles: Record<string, Profile>;
  chemistry: LineupChemistry;
  onSlotPress?: (slot: LineupSlot) => void;
}) {
  const bySlotIndex = new Map(slots.map((s) => [s.slot_index, s]));

  return (
    <View style={styles.pitch}>
      {/* markings */}
      <View style={styles.outline} pointerEvents="none" />
      <View style={styles.halfway} pointerEvents="none" />
      <View style={styles.centerCircle} pointerEvents="none" />
      <View style={[styles.box, { top: -1 }]} pointerEvents="none" />
      <View style={[styles.box, { bottom: -1 }]} pointerEvents="none" />

      {formation.slots.map((fSlot, index) => {
        const slot = bySlotIndex.get(index);
        const player = slot?.player_id ? profiles[slot.player_id] : undefined;
        const chem = slot ? chemistry.bySlot[slot.id] : undefined;
        return (
          <TouchableOpacity
            key={index}
            disabled={!slot || !onSlotPress}
            onPress={() => slot && onSlotPress?.(slot)}
            style={[
              styles.slot,
              {
                left: `${fSlot.x}%`,
                top: `${fSlot.y}%`,
              },
              player ? styles.slotFilled : styles.slotOpen,
            ]}
          >
            <Text style={styles.slotPosition}>{fSlot.position}</Text>
            {player ? (
              <>
                <Text style={styles.slotName} numberOfLines={1}>
                  {player.username}
                </Text>
                <Text style={styles.slotOverall}>
                  {overallFor(player)}
                </Text>
              </>
            ) : (
              <Text style={styles.slotOpenText}>OPEN</Text>
            )}
            {chem && (
              <View style={styles.chemPill}>
                <Text style={styles.chemText}>+{chem.points}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const LINE = colors.pitchLine;

const styles = StyleSheet.create({
  pitch: {
    width: "100%",
    aspectRatio: 0.78,
    backgroundColor: colors.pitch,
    borderRadius: 12,
    overflow: "hidden",
  },
  outline: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderWidth: 1.5,
    borderColor: LINE,
    borderRadius: 4,
  },
  halfway: {
    position: "absolute",
    top: "50%",
    left: 8,
    right: 8,
    height: 1.5,
    backgroundColor: LINE,
  },
  centerCircle: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 70,
    height: 70,
    marginLeft: -35,
    marginTop: -35,
    borderRadius: 35,
    borderWidth: 1.5,
    borderColor: LINE,
  },
  box: {
    position: "absolute",
    left: "28%",
    width: "44%",
    height: "13%",
    borderWidth: 1.5,
    borderColor: LINE,
  },
  slot: {
    position: "absolute",
    width: 66,
    marginLeft: -33,
    marginTop: -26,
    borderRadius: 10,
    paddingVertical: 4,
    alignItems: "center",
    borderWidth: 1.5,
  },
  slotFilled: {
    backgroundColor: "rgba(14,17,22,0.88)",
    borderColor: colors.accent,
  },
  slotOpen: {
    backgroundColor: "rgba(14,17,22,0.55)",
    borderColor: "rgba(255,255,255,0.35)",
    borderStyle: "dashed",
  },
  slotPosition: { color: colors.textMuted, fontSize: 9, fontWeight: "800" },
  slotName: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
    maxWidth: 60,
  },
  slotOverall: { color: colors.accent, fontSize: 11, fontWeight: "800" },
  slotOpenText: { color: "#fff", fontSize: 11, fontWeight: "700", opacity: 0.8 },
  chemPill: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: colors.warning,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  chemText: { color: "#3a2b00", fontSize: 9, fontWeight: "800" },
});
