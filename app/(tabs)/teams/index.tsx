import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Button,
  Card,
  EmptyState,
  Input,
  KeyboardAwareScroll,
  Loading,
  SectionTitle,
} from "../../../src/components/ui";
import { showAlert } from "../../../src/lib/alert";
import { supabase, TEAM_COLUMNS } from "../../../src/lib/supabase";
import { useUserId } from "../../../src/providers/AuthProvider";
import { colors } from "../../../src/theme";
import type { Team } from "../../../src/types";

export default function TeamsScreen() {
  const userId = useUserId();
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [newName, setNewName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("team_members")
      .select(`teams(${TEAM_COLUMNS})`)
      .eq("user_id", userId);
    // A failed load must not read as "you have no teams".
    setLoadFailed(!!error);
    setTeams(((data ?? []) as any[]).map((row) => row.teams as Team));
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const createTeam = async () => {
    setBusy("create");
    const { data, error } = await supabase
      .from("teams")
      .insert({ name: newName.trim(), captain_id: userId })
      .select(TEAM_COLUMNS)
      .single<Team>();
    setBusy(null);
    if (error || !data) {
      showAlert("Could not create team", error?.message ?? "Unknown error");
      return;
    }
    setNewName("");
    router.push(`/teams/${data.id}`);
  };

  const joinTeam = async () => {
    setBusy("join");
    // join_team verifies the invite code server-side and adds the caller.
    // Membership can't be inserted directly, so knowing a team id is not
    // enough to join one.
    const { data: teamId, error } = await supabase.rpc("join_team", {
      p_code: joinCode.trim().toUpperCase(),
    });
    setBusy(null);
    if (error || !teamId) {
      showAlert("Could not join", error?.message ?? "No team with that code.");
      return;
    }
    setJoinCode("");
    router.push(`/teams/${teamId}`);
  };

  if (teams === null) return <Loading />;

  return (
    <KeyboardAwareScroll contentContainerStyle={styles.content}>
      <SectionTitle>My Teams</SectionTitle>
      {loadFailed ? (
        <EmptyState text="Couldn't load your teams. Check your connection, then come back to this tab." />
      ) : teams.length === 0 ? (
        <EmptyState text="You're not in any team yet. Create one or join with a code from your captain." />
      ) : (
        teams.map((team) => (
          <TouchableOpacity key={team.id} onPress={() => router.push(`/teams/${team.id}`)}>
            <Card style={styles.teamRow}>
              <View style={styles.crest}>
                <Text style={styles.crestText}>
                  {team.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.teamName}>{team.name}</Text>
                {team.captain_id === userId && (
                  <Text style={styles.captainTag}>You're the captain</Text>
                )}
              </View>
              <Text style={styles.chev}>›</Text>
            </Card>
          </TouchableOpacity>
        ))
      )}

      <Card style={styles.form}>
        <SectionTitle>Create a team</SectionTitle>
        <Input
          value={newName}
          onChangeText={setNewName}
          placeholder="Team name"
          maxLength={32}
        />
        <Button
          title="Create Team"
          onPress={createTeam}
          loading={busy === "create"}
          disabled={newName.trim().length < 2 || busy !== null}
        />
      </Card>

      <Card style={styles.form}>
        <SectionTitle>Join with a code</SectionTitle>
        <Input
          value={joinCode}
          onChangeText={setJoinCode}
          placeholder="6-character code"
          autoCapitalize="characters"
          maxLength={6}
        />
        <Button
          title="Join Team"
          onPress={joinTeam}
          variant="secondary"
          loading={busy === "join"}
          disabled={joinCode.trim().length !== 6 || busy !== null}
        />
      </Card>
    </KeyboardAwareScroll>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  teamRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  crest: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  crestText: { color: colors.accent, fontWeight: "800", fontSize: 16 },
  teamName: { color: colors.text, fontWeight: "700", fontSize: 16 },
  captainTag: { color: colors.warning, fontSize: 12, fontWeight: "600" },
  chev: { color: colors.textMuted, fontSize: 24 },
  form: { gap: 10 },
});
