import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { PitchView } from "../../../../../src/components/PitchView";
import { Card, Loading, SectionTitle } from "../../../../../src/components/ui";
import { getFormation } from "../../../../../src/constants/formations";
import { supabase } from "../../../../../src/lib/supabase";
import { calcLineupChemistry } from "../../../../../src/logic/chemistry";
import { useUserId } from "../../../../../src/providers/AuthProvider";
import { colors } from "../../../../../src/theme";
import type { Lineup, LineupSlot, Profile, Team } from "../../../../../src/types";

export default function LineupScreen() {
  const { id: teamId, lineupId } = useLocalSearchParams<{
    id: string;
    lineupId: string;
  }>();
  const userId = useUserId();
  const [lineup, setLineup] = useState<Lineup | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [slots, setSlots] = useState<LineupSlot[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  const load = useCallback(async () => {
    const [lineupRes, teamRes, slotsRes, membersRes] = await Promise.all([
      supabase.from("lineups").select("*").eq("id", lineupId).single<Lineup>(),
      supabase.from("teams").select("*").eq("id", teamId).single<Team>(),
      supabase
        .from("lineup_slots")
        .select("*")
        .eq("lineup_id", lineupId)
        .order("slot_index"),
      supabase.from("team_members").select("profiles(*)").eq("team_id", teamId),
    ]);
    setLineup(lineupRes.data);
    setTeam(teamRes.data);
    setSlots((slotsRes.data ?? []) as LineupSlot[]);
    const map: Record<string, Profile> = {};
    for (const row of (membersRes.data ?? []) as any[]) {
      const profile = row.profiles as Profile;
      map[profile.id] = profile;
    }
    setProfiles(map);
  }, [teamId, lineupId]);

  useEffect(() => {
    load();
    // Live updates: refresh when anyone claims or leaves a slot.
    const channel = supabase
      .channel(`lineup-${lineupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lineup_slots",
          filter: `lineup_id=eq.${lineupId}`,
        },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, lineupId]);

  const chemistry = useMemo(
    () => calcLineupChemistry(slots, profiles),
    [slots, profiles],
  );

  if (!lineup || !team) return <Loading />;

  const formation = getFormation(lineup.formation);
  if (!formation) {
    return (
      <View style={styles.screen}>
        <Text style={{ color: colors.danger, padding: 20 }}>
          Unknown formation: {lineup.formation}
        </Text>
      </View>
    );
  }

  const isCaptain = team.captain_id === userId;
  const mySlot = slots.find((slot) => slot.player_id === userId);

  const claim = async (slot: LineupSlot) => {
    // A player holds at most one slot per lineup, so leave the old one first.
    if (mySlot && mySlot.id !== slot.id) {
      await supabase
        .from("lineup_slots")
        .update({ player_id: null })
        .eq("id", mySlot.id);
    }
    const { error } = await supabase
      .from("lineup_slots")
      .update({ player_id: userId })
      .eq("id", slot.id)
      .is("player_id", null);
    if (error) Alert.alert("Could not claim slot", error.message);
    load();
  };

  const release = async (slot: LineupSlot) => {
    const { error } = await supabase
      .from("lineup_slots")
      .update({ player_id: null })
      .eq("id", slot.id);
    if (error) Alert.alert("Could not update slot", error.message);
    load();
  };

  const onSlotPress = (slot: LineupSlot) => {
    if (slot.player_id === userId) {
      Alert.alert("Leave position?", `Give up the ${slot.position} slot?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: () => release(slot) },
      ]);
    } else if (slot.player_id === null) {
      claim(slot);
    } else if (isCaptain) {
      const player = profiles[slot.player_id];
      Alert.alert(
        "Captain action",
        `Remove ${player?.username ?? "player"} from ${slot.position}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: () => release(slot) },
        ],
      );
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{lineup.name}</Text>
        <View style={styles.chemBadge}>
          <Text style={styles.chemValue}>
            {chemistry.total}
            <Text style={styles.chemMax}>/{chemistry.max || "—"}</Text>
          </Text>
          <Text style={styles.chemLabel}>CHEMISTRY</Text>
        </View>
      </View>

      <PitchView
        formation={formation}
        slots={slots}
        profiles={profiles}
        chemistry={chemistry}
        onSlotPress={onSlotPress}
      />

      <Card style={{ gap: 6 }}>
        <SectionTitle>How chemistry works</SectionTitle>
        <Text style={styles.help}>
          +3 in your preferred position, +1 in an adjacent one, 0 out of
          position. +1 bonus if a teammate in the lineup shares one of your
          PlayStyle categories.
        </Text>
        <Text style={styles.help}>
          Tap an open slot to claim it{isCaptain ? ". As captain, tap a filled slot to clear it." : ", or your own slot to leave it."}
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: colors.text, fontSize: 20, fontWeight: "800", flex: 1 },
  chemBadge: { alignItems: "center" },
  chemValue: { color: colors.warning, fontSize: 24, fontWeight: "800" },
  chemMax: { color: colors.textMuted, fontSize: 14 },
  chemLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  help: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
});
