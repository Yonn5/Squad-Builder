import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Formation } from "../constants/formations";
import { isCutOutUrl } from "../lib/photoStorage";
import {
  CARD_RATIO,
  PITCH_ASPECT,
  cardTopLeft,
  cardWidthFor,
} from "../logic/pitchLayout";
import type { LineupChemistry } from "../logic/chemistry";
import { colors } from "../theme";
import type { LineupSlot, Profile } from "../types";
import { EmptyCard, PlayerCard } from "./PlayerCard";

/**
 * Renders a formation on a pitch, own goal at the bottom. Every slot is a
 * card: the player's own card once someone has claimed it, otherwise an
 * empty card with the slot's position. Tapping a slot is handled by the
 * parent.
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
  const [pitchWidth, setPitchWidth] = useState(0);
  const cardWidth = pitchWidth ? cardWidthFor(formation, pitchWidth) : 0;
  const cardHeight = cardWidth * CARD_RATIO;

  return (
    <View
      style={styles.pitch}
      onLayout={(e) => setPitchWidth(e.nativeEvent.layout.width)}
    >
      {/* markings */}
      <View style={styles.outline} pointerEvents="none" />
      <View style={styles.halfway} pointerEvents="none" />
      <View style={styles.centerCircle} pointerEvents="none" />
      <View style={[styles.box, { top: -1 }]} pointerEvents="none" />
      <View style={[styles.box, { bottom: -1 }]} pointerEvents="none" />

      {cardWidth > 0 &&
        formation.slots.map((fSlot, index) => {
          const slot = bySlotIndex.get(index);
          const player = slot?.player_id ? profiles[slot.player_id] : undefined;
          const chem = slot ? chemistry.bySlot[slot.id] : undefined;
          const { left, top } = cardTopLeft(fSlot, pitchWidth, cardWidth);
          return (
            <TouchableOpacity
              key={index}
              testID={`slot-${index}`}
              accessibilityLabel={
                player
                  ? `${fSlot.position}: ${player.username}`
                  : `${fSlot.position}: open`
              }
              disabled={!slot || !onSlotPress}
              onPress={() => slot && onSlotPress?.(slot)}
              style={[
                styles.slot,
                { left, top, width: cardWidth, height: cardHeight },
              ]}
            >
              {player ? (
                <PlayerCard
                  compact
                  width={cardWidth}
                  name={player.username}
                  position={player.position}
                  stats={{
                    pac: player.pac,
                    sho: player.sho,
                    pas: player.pas,
                    dri: player.dri,
                    def: player.def,
                    phy: player.phy,
                  }}
                  gkStats={{
                    gk_div: player.gk_div ?? 70,
                    gk_han: player.gk_han ?? 70,
                    gk_kic: player.gk_kic ?? 70,
                    gk_ref: player.gk_ref ?? 70,
                    gk_spd: player.gk_spd ?? 70,
                    gk_pos: player.gk_pos ?? 70,
                  }}
                  playstyles={[]}
                  photoUri={player.photo_url}
                  photoCutOut={
                    player.photo_url ? isCutOutUrl(player.photo_url) : false
                  }
                  // Playing out of their own position: say where.
                  footer={
                    player.position !== fSlot.position
                      ? `at ${fSlot.position}`
                      : undefined
                  }
                />
              ) : (
                <EmptyCard position={fSlot.position} width={cardWidth} />
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
    aspectRatio: PITCH_ASPECT,
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
  slot: { position: "absolute" },
  chemPill: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: colors.warning,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  chemText: { color: "#3a2b00", fontSize: 9, fontWeight: "800" },
});
