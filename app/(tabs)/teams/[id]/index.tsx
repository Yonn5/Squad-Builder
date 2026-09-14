import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Button,
  Card,
  EmptyState,
  Loading,
  SectionTitle,
} from "../../../../src/components/ui";
import {
  formationsForSize,
  type Formation,
} from "../../../../src/constants/formations";
import { confirmDialog, showAlert } from "../../../../src/lib/alert";
import { supabase } from "../../../../src/lib/supabase";
import { overallFor, tierFor } from "../../../../src/logic/overall";
import { useUserId } from "../../../../src/providers/AuthProvider";
import { colors, tierColors } from "../../../../src/theme";
import type { Lineup, Profile, Team } from "../../../../src/types";

export default function TeamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [size, setSize] = useState<6 | 10>(6);
  const [formation, setFormation] = useState<Formation | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [teamRes, membersRes, lineupsRes] = await Promise.all([
      supabase.from("teams").select("*").eq("id", id).single<Team>(),
      supabase.from("team_members").select("profiles(*)").eq("team_id", id),
      supabase
        .from("lineups")
        .select("*")
        .eq("team_id", id)
        .order("created_at", { ascending: false }),
    ]);
    setTeam(teamRes.data);
    setMembers(
      ((membersRes.data ?? []) as any[]).map((row) => row.profiles as Profile),
    );
    setLineups((lineupsRes.data ?? []) as Lineup[]);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!team) return <Loading />;

  const isCaptain = team.captain_id === userId;
  const formations = formationsForSize(size);

  const createLineup = async () => {
    if (!formation) return;
    setBusy(true);
    const { data: lineup, error } = await supabase
      .from("lineups")
      .insert({
        team_id: team.id,
        name: `${size}v${size} ${formation.label}`,
        formation: formation.key,
        size,
      })
      .select()
      .single<Lineup>();
    if (error || !lineup) {
      setBusy(false);
      showAlert("Could not create lineup", error?.message ?? "Unknown error");
      return;
    }
    const { error: slotsError } = await supabase.from("lineup_slots").insert(
      formation.slots.map((slot, index) => ({
        lineup_id: lineup.id,
        slot_index: index,
        position: slot.position,
      })),
    );
    setBusy(false);
    if (slotsError) {
      showAlert("Could not create slots", slotsError.message);
      return;
    }
    router.push(`/teams/${team.id}/lineups/${lineup.id}`);
  };

  const removeMember = async (member: Profile) => {
    if (
      !(await confirmDialog(
        "Remove player",
        `Remove ${member.username} from ${team.name}? Their card and career stats are not affected.`,
        "Remove",
      ))
    )
      return;
    setBusy(true);
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", team.id)
      .eq("user_id", member.id);
    setBusy(false);
    if (error) showAlert("Could not remove player", error.message);
    else load();
  };

  const leaveTeam = async () => {
    if (
      !(await confirmDialog(
        "Leave team",
        `Leave ${team.name}? You will need the invite code to rejoin.`,
        "Leave",
      ))
    )
      return;
    setBusy(true);
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", team.id)
      .eq("user_id", userId);
    setBusy(false);
    if (error) showAlert("Could not leave team", error.message);
    else router.replace("/teams");
  };

  const deleteTeam = async () => {
    if (
      !(await confirmDialog(
        "Delete team",
        `Permanently delete ${team.name}? Its lineups and fixtures go with it. This cannot be undone.`,
        "Delete",
      ))
    )
      return;
    setBusy(true);
    const { error } = await supabase.from("teams").delete().eq("id", team.id);
    setBusy(false);
    if (error) showAlert("Could not delete team", error.message);
    else router.replace("/teams");
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.teamName}>{team.name}</Text>
      {isCaptain && (
        <Card style={styles.joinCard}>
          <Text style={styles.joinLabel}>Invite code — share with friends</Text>
          <Text style={styles.joinCode}>{team.join_code}</Text>
        </Card>
      )}

      <SectionTitle>Squad ({members.length})</SectionTitle>
      {members.map((member) => {
        const overall = overallFor(member);
        const tier = tierColors[tierFor(overall)];
        return (
          <Card key={member.id} style={styles.memberRow}>
            <View style={[styles.ovrBadge, { backgroundColor: tier.gradient[1] }]}>
              <Text style={[styles.ovrText, { color: tier.text }]}>{overall}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>
                {member.username}
                {member.id === team.captain_id ? "  ©" : ""}
              </Text>
              <Text style={styles.memberPos}>{member.position}</Text>
            </View>
            <Text style={styles.memberStyles}>
              {member.playstyles.length} PS+
            </Text>
            {isCaptain && member.id !== team.captain_id && (
              <TouchableOpacity
                onPress={() => removeMember(member)}
                hitSlop={10}
                style={styles.removeBtn}
              >
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            )}
          </Card>
        );
      })}

      <SectionTitle>Lineups</SectionTitle>
      {lineups.length === 0 ? (
        <EmptyState
          text={
            isCaptain
              ? "No lineups yet — set a formation below."
              : "No lineups yet. Your captain sets the formation."
          }
        />
      ) : (
        lineups.map((lineup) => (
          <TouchableOpacity
            key={lineup.id}
            onPress={() => router.push(`/teams/${team.id}/lineups/${lineup.id}`)}
          >
            <Card style={styles.memberRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{lineup.name}</Text>
                <Text style={styles.memberPos}>
                  {lineup.size}v{lineup.size}
                </Text>
              </View>
              <Text style={styles.chev}>›</Text>
            </Card>
          </TouchableOpacity>
        ))
      )}

      {isCaptain && (
        <Card style={{ gap: 10 }}>
          <SectionTitle>New lineup</SectionTitle>
          <View style={styles.sizeRow}>
            {([6, 10] as const).map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => {
                  setSize(option);
                  setFormation(null);
                }}
                style={[styles.sizeChip, size === option && styles.chipActive]}
              >
                <Text
                  style={[
                    styles.chipText,
                    size === option && styles.chipTextActive,
                  ]}
                >
                  {option}v{option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.sizeRow}>
            {formations.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFormation(f)}
                style={[
                  styles.sizeChip,
                  formation?.key === f.key && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    formation?.key === f.key && styles.chipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Button
            title="Create Lineup"
            onPress={createLineup}
            loading={busy}
            disabled={!formation}
          />
        </Card>
      )}

      {isCaptain ? (
        <Button
          title="Delete Team"
          onPress={deleteTeam}
          variant="danger"
          loading={busy}
        />
      ) : (
        <Button
          title="Leave Team"
          onPress={leaveTeam}
          variant="danger"
          loading={busy}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  teamName: { color: colors.text, fontSize: 26, fontWeight: "800" },
  joinCard: { alignItems: "center", gap: 4 },
  joinLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  joinCode: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 6,
  },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  ovrBadge: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  ovrText: { fontWeight: "800", fontSize: 15 },
  memberName: { color: colors.text, fontWeight: "700", fontSize: 15 },
  memberPos: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  memberStyles: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  removeBtn: {
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  removeText: { color: colors.danger, fontSize: 12, fontWeight: "700" },
  chev: { color: colors.textMuted, fontSize: 24 },
  sizeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sizeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: "#12291c" },
  chipText: { color: colors.textMuted, fontWeight: "700", fontSize: 13 },
  chipTextActive: { color: colors.accent },
});
