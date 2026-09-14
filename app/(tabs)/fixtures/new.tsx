import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  Button,
  Card,
  EmptyState,
  Input,
  KeyboardAwareScroll,
  Label,
  Loading,
  SectionTitle,
} from "../../../src/components/ui";
import { showAlert } from "../../../src/lib/alert";
import { supabase } from "../../../src/lib/supabase";
import { useUserId } from "../../../src/providers/AuthProvider";
import { colors } from "../../../src/theme";
import type { Team } from "../../../src/types";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function NewFixtureScreen() {
  const userId = useUserId();
  // The matchday is chosen on the calendar and passed in, so there is no
  // date field here.
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const date = dateParam ?? todayKey();
  const [myTeams, setMyTeams] = useState<Team[] | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [opponentCode, setOpponentCode] = useState("");
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [searching, setSearching] = useState(false);
  const [time, setTime] = useState("19:00");
  const [size, setSize] = useState<6 | 10>(6);
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("teams")
      .select("*")
      .eq("captain_id", userId);
    const mine = (data ?? []) as Team[];
    setMyTeams(mine);
    if (mine.length === 1) setHomeTeam(mine[0]);
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

  const findOpponent = async () => {
    const code = opponentCode.trim().toUpperCase();
    setSearching(true);
    const { data: team } = await supabase
      .from("teams")
      .select("*")
      .eq("join_code", code)
      .maybeSingle<Team>();
    setSearching(false);
    if (!team) {
      showAlert("No match", `No team found with invite code ${code}.`);
      return;
    }
    if (myTeams.some((t) => t.id === team.id)) {
      showAlert("That's your team", "Search for the code of the team you want to play against.");
      return;
    }
    setAwayTeam(team);
  };

  const propose = async () => {
    if (!homeTeam || !awayTeam) return;
    const kickoff = new Date(`${date}T${time.trim()}:00`);
    if (isNaN(kickoff.getTime())) {
      showAlert("Invalid time", "Enter the kickoff time as HH:MM (24h).");
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
        size,
        location: location.trim() || null,
      })
      .select()
      .single();
    setBusy(false);
    if (error || !data) {
      showAlert("Could not schedule", error?.message ?? "Unknown error");
      return;
    }
    router.replace(`/fixtures/${data.id}`);
  };

  return (
    <KeyboardAwareScroll contentContainerStyle={styles.content}>
      <Card style={{ gap: 10 }}>
        <SectionTitle>Your team</SectionTitle>
        <View style={styles.chips}>
          {myTeams.map((team) => (
            <TouchableOpacity
              key={team.id}
              onPress={() => setHomeTeam(team)}
              style={[styles.chip, homeTeam?.id === team.id && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  homeTeam?.id === team.id && styles.chipTextActive,
                ]}
              >
                {team.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={{ gap: 10 }}>
        <SectionTitle>Find opponent</SectionTitle>
        <Text style={styles.hint}>
          Ask the other captain for their 6-character invite code — the same
          one players use to join their squad.
        </Text>
        <View style={styles.searchRow}>
          <Input
            value={opponentCode}
            onChangeText={(text) => {
              setOpponentCode(text);
              setAwayTeam(null);
            }}
            placeholder="e.g. 574365"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            style={{ flex: 1 }}
          />
          <Button
            title="Search"
            onPress={findOpponent}
            loading={searching}
            disabled={opponentCode.trim().length !== 6}
          />
        </View>
        {awayTeam && (
          <View style={styles.found}>
            <View style={styles.crest}>
              <Text style={styles.crestText}>
                {awayTeam.name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.foundName}>{awayTeam.name}</Text>
              <Text style={styles.foundMeta}>Opponent selected</Text>
            </View>
            <Text style={styles.tick}>✓</Text>
          </View>
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <SectionTitle>Kickoff</SectionTitle>
        <View style={styles.dateBanner}>
          <Text style={styles.dateText}>
            {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
          <Text style={styles.dateHint}>Pick a different date on the calendar</Text>
        </View>
        <Label>Time (24h)</Label>
        <Input value={time} onChangeText={setTime} placeholder="19:00" />
        <Label>Format</Label>
        <View style={styles.chips}>
          {([6, 10] as const).map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => setSize(option)}
              style={[styles.chip, size === option && styles.chipActive]}
            >
              <Text
                style={[styles.chipText, size === option && styles.chipTextActive]}
              >
                {option}v{option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
        disabled={!homeTeam || !awayTeam}
      />
      <Text style={styles.hint}>
        The opposing captain will see the proposal and can accept or decline it.
      </Text>
    </KeyboardAwareScroll>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
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
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateBanner: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    padding: 12,
  },
  dateText: { color: colors.text, fontWeight: "700", fontSize: 15 },
  dateHint: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  found: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: "#12291c",
    borderRadius: 10,
    padding: 10,
  },
  crest: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  crestText: { color: colors.accent, fontWeight: "800", fontSize: 15 },
  foundName: { color: colors.text, fontWeight: "700", fontSize: 15 },
  foundMeta: { color: colors.accent, fontSize: 12, fontWeight: "600" },
  tick: { color: colors.accent, fontSize: 20, fontWeight: "800" },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
});
