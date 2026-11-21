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
import { supabase, TEAM_COLUMNS } from "../../../../src/lib/supabase";
import { overallFor, tierFor } from "../../../../src/logic/overall";
import { colors, tierColors } from "../../../../src/theme";
import type { Profile, Team } from "../../../../src/types";

/** Everyone in the team; tap a player to see their card. */
export default function SquadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [problem, setProblem] = useState<"missing" | "failed" | null>(null);

  const load = useCallback(async () => {
    const [teamRes, membersRes] = await Promise.all([
      supabase
        .from("teams")
        .select(TEAM_COLUMNS)
        .eq("id", id)
        .maybeSingle<Team>(),
      supabase.from("team_members").select("profiles(*)").eq("team_id", id),
    ]);
    setProblem(
      teamRes.error || membersRes.error
        ? "failed"
        : teamRes.data
          ? null
          : "missing",
    );
    setTeam(teamRes.data);
    setMembers(
      ((membersRes.data ?? []) as any[]).map((row) => row.profiles as Profile),
    );
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (problem) {
    return (
      <View style={styles.problem}>
        <EmptyState
          text={
            problem === "missing"
              ? "This team no longer exists. Its captain may have deleted it."
              : "Couldn't load the squad. Check your connection and try again."
          }
        />
        <Button
          title="Back to Teams"
          onPress={() => router.replace("/teams")}
        />
      </View>
    );
  }
  if (!team) return <Loading />;

  // Captain first; everyone else in the order they joined.
  const ordered = [
    ...members.filter((m) => m.id === team.captain_id),
    ...members.filter((m) => m.id !== team.captain_id),
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.teamName}>{team.name}</Text>
      <SectionTitle>Squad ({members.length})</SectionTitle>
      {ordered.map((member) => {
        const overall = overallFor(member);
        const tier = tierColors[tierFor(overall)];
        return (
          <TouchableOpacity
            key={member.id}
            onPress={() =>
              router.push(`/teams/${team.id}/players/${member.id}`)
            }
            accessibilityRole="button"
          >
            <Card style={styles.memberRow}>
              <View
                style={[styles.ovrBadge, { backgroundColor: tier.gradient[1] }]}
              >
                <Text style={[styles.ovrText, { color: tier.text }]}>
                  {overall}
                </Text>
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
              <Text style={styles.chev}>›</Text>
            </Card>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  problem: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  teamName: { color: colors.text, fontSize: 26, fontWeight: "800" },
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
  chev: { color: colors.textMuted, fontSize: 24 },
});
