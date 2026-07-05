import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
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
  Input,
  Label,
  Loading,
  SectionTitle,
} from "../../../src/components/ui";
import { supabase } from "../../../src/lib/supabase";
import { useUserId } from "../../../src/providers/AuthProvider";
import { colors } from "../../../src/theme";
import type { Team } from "../../../src/types";

export default function NewFixtureScreen() {
  const userId = useUserId();
  const [myTeams, setMyTeams] = useState<Team[] | null>(null);
  const [opponents, setOpponents] = useState<Team[]>([]);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("19:00");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [mineRes, allRes] = await Promise.all([
      supabase.from("teams").select("*").eq("captain_id", userId),
      supabase.from("teams").select("*").order("name"),
    ]);
    const mine = (mineRes.data ?? []) as Team[];
    setMyTeams(mine);
    if (mine.length === 1) setHomeTeam(mine[0]);
    const myIds = new Set(mine.map((t) => t.id));
    setOpponents(((allRes.data ?? []) as Team[]).filter((t) => !myIds.has(t.id)));
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (myTeams === null) return <Loading />;

  if (myTeams.length === 0) {
    return (
      <View style={styles.screen}>
        <EmptyState text="Only captains can schedule matches. Create a team first." />
      </View>
    );
  }

  const propose = async () => {
    if (!homeTeam || !awayTeam) return;
    const kickoff = new Date(`${date.trim()}T${time.trim()}:00`);
    if (isNaN(kickoff.getTime())) {
      Alert.alert(
        "Invalid date",
        "Use YYYY-MM-DD for the date and HH:MM (24h) for the time.",
      );
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("matches")
      .insert({
        home_team_id: homeTeam.id,
        away_team_id: awayTeam.id,
        created_by: userId,
        kickoff_at: kickoff.toISOString(),
        location: location.trim() || null,
      })
      .select()
      .single();
    setBusy(false);
    if (error || !data) {
      Alert.alert("Could not schedule", error?.message ?? "Unknown error");
      return;
    }
    router.replace(`/fixtures/${data.id}`);
  };

  const TeamPicker = ({
    teams,
    selected,
    onSelect,
  }: {
    teams: Team[];
    selected: Team | null;
    onSelect: (team: Team) => void;
  }) => (
    <View style={styles.chips}>
      {teams.map((team) => (
        <TouchableOpacity
          key={team.id}
          onPress={() => onSelect(team)}
          style={[styles.chip, selected?.id === team.id && styles.chipActive]}
        >
          <Text
            style={[
              styles.chipText,
              selected?.id === team.id && styles.chipTextActive,
            ]}
          >
            {team.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={{ gap: 10 }}>
        <SectionTitle>Your team</SectionTitle>
        <TeamPicker teams={myTeams} selected={homeTeam} onSelect={setHomeTeam} />
      </Card>

      <Card style={{ gap: 10 }}>
        <SectionTitle>Opponent</SectionTitle>
        {opponents.length === 0 ? (
          <EmptyState text="No other teams exist yet." />
        ) : (
          <TeamPicker teams={opponents} selected={awayTeam} onSelect={setAwayTeam} />
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <SectionTitle>Kickoff</SectionTitle>
        <Label>Date (YYYY-MM-DD)</Label>
        <Input value={date} onChangeText={setDate} placeholder="2026-07-12" />
        <Label>Time (24h)</Label>
        <Input value={time} onChangeText={setTime} placeholder="19:00" />
        <Label>Location (optional)</Label>
        <Input
          value={location}
          onChangeText={setLocation}
          placeholder="Main St pitch"
        />
      </Card>

      <Button
        title="Propose Match"
        onPress={propose}
        loading={busy}
        disabled={!homeTeam || !awayTeam || !date}
      />
      <Text style={styles.hint}>
        The opposing captain will see the proposal and can accept or decline it.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
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
  hint: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
});
