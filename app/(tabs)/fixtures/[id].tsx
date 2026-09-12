import { useFocusEffect, useLocalSearchParams } from "expo-router";
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
  Input,
  KeyboardAwareScroll,
  Loading,
  SectionTitle,
} from "../../../src/components/ui";
import { showAlert } from "../../../src/lib/alert";
import { supabase } from "../../../src/lib/supabase";
import { useUserId } from "../../../src/providers/AuthProvider";
import { colors } from "../../../src/theme";
import type {
  Match,
  MatchPlayerStats,
  Profile,
  Team,
} from "../../../src/types";

type MatchWithTeams = Match & { home: Team; away: Team };

type StatEntry = {
  played: boolean;
  goals: number;
  assists: number;
  motm: boolean;
};

const emptyEntry: StatEntry = { played: true, goals: 0, assists: 0, motm: false };

export default function FixtureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  const [match, setMatch] = useState<MatchWithTeams | null>(null);
  const [homeMembers, setHomeMembers] = useState<Profile[]>([]);
  const [awayMembers, setAwayMembers] = useState<Profile[]>([]);
  const [savedStats, setSavedStats] = useState<MatchPlayerStats[]>([]);
  const [editing, setEditing] = useState(false);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [entries, setEntries] = useState<Record<string, StatEntry>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: matchData } = await supabase
      .from("matches")
      .select(
        "*, home:teams!matches_home_team_id_fkey(*), away:teams!matches_away_team_id_fkey(*)",
      )
      .eq("id", id)
      .single<MatchWithTeams>();
    if (!matchData) return;
    setMatch(matchData);

    const [homeRes, awayRes, statsRes] = await Promise.all([
      supabase
        .from("team_members")
        .select("profiles(*)")
        .eq("team_id", matchData.home_team_id),
      supabase
        .from("team_members")
        .select("profiles(*)")
        .eq("team_id", matchData.away_team_id),
      supabase.from("match_player_stats").select("*").eq("match_id", id),
    ]);
    setHomeMembers(((homeRes.data ?? []) as any[]).map((r) => r.profiles as Profile));
    setAwayMembers(((awayRes.data ?? []) as any[]).map((r) => r.profiles as Profile));
    setSavedStats((statsRes.data ?? []) as MatchPlayerStats[]);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!match) return <Loading />;

  const isHomeCaptain = match.home.captain_id === userId;
  const isAwayCaptain = match.away.captain_id === userId;
  const isCaptain = isHomeCaptain || isAwayCaptain;
  const kickoff = new Date(match.kickoff_at);

  const setStatus = async (status: Match["status"]) => {
    setBusy(true);
    const { error } = await supabase
      .from("matches")
      .update({ status })
      .eq("id", match.id);
    setBusy(false);
    if (error) showAlert("Update failed", error.message);
    else load();
  };

  const startEditing = () => {
    setHomeScore(match.home_score?.toString() ?? "");
    setAwayScore(match.away_score?.toString() ?? "");
    const initial: Record<string, StatEntry> = {};
    for (const member of [...homeMembers, ...awayMembers]) {
      const existing = savedStats.find((s) => s.player_id === member.id);
      initial[member.id] = existing
        ? {
            played: true,
            goals: existing.goals,
            assists: existing.assists,
            motm: existing.motm,
          }
        : { ...emptyEntry, played: savedStats.length === 0 };
    }
    setEntries(initial);
    setEditing(true);
  };

  const updateEntry = (playerId: string, patch: Partial<StatEntry>) => {
    setEntries((prev) => {
      const next = { ...prev, [playerId]: { ...prev[playerId], ...patch } };
      // only one MOTM per match
      if (patch.motm) {
        for (const key of Object.keys(next)) {
          if (key !== playerId) next[key] = { ...next[key], motm: false };
        }
      }
      return next;
    });
  };

  const saveResult = async () => {
    const home = parseInt(homeScore, 10);
    const away = parseInt(awayScore, 10);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      showAlert("Invalid score", "Enter a number for both teams.");
      return;
    }
    setBusy(true);
    const { error: matchError } = await supabase
      .from("matches")
      .update({ home_score: home, away_score: away, status: "completed" })
      .eq("id", match.id);
    if (matchError) {
      setBusy(false);
      showAlert("Save failed", matchError.message);
      return;
    }
    // Replace stats wholesale so unchecking "played" removes stale rows.
    await supabase.from("match_player_stats").delete().eq("match_id", match.id);
    const rows = [...homeMembers, ...awayMembers]
      .filter((member) => entries[member.id]?.played)
      .map((member) => ({
        match_id: match.id,
        team_id: homeMembers.some((m) => m.id === member.id)
          ? match.home_team_id
          : match.away_team_id,
        player_id: member.id,
        goals: entries[member.id].goals,
        assists: entries[member.id].assists,
        motm: entries[member.id].motm,
      }));
    const { error: statsError } =
      rows.length > 0
        ? await supabase.from("match_player_stats").insert(rows)
        : { error: null };
    setBusy(false);
    if (statsError) {
      showAlert("Stats save failed", statsError.message);
      return;
    }
    setEditing(false);
    load();
  };

  const renderStatsTable = (team: Team, members: Profile[]) => {
    const rows = savedStats.filter((s) => s.team_id === team.id);
    if (rows.length === 0) return null;
    return (
      <Card style={{ gap: 8 }}>
        <SectionTitle>{team.name}</SectionTitle>
        {rows.map((row) => {
          const player = members.find((m) => m.id === row.player_id);
          return (
            <View key={row.id} style={styles.statLine}>
              <Text style={styles.statName}>
                {player?.username ?? "Unknown"}
                {row.motm ? " ⭐" : ""}
              </Text>
              <Text style={styles.statNums}>
                {row.goals}G · {row.assists}A
              </Text>
            </View>
          );
        })}
      </Card>
    );
  };

  const renderEntryRows = (team: Team, members: Profile[]) => (
    <Card style={{ gap: 10 }}>
      <SectionTitle>{team.name}</SectionTitle>
      {members.map((member) => {
        const entry = entries[member.id] ?? emptyEntry;
        return (
          <View key={member.id} style={styles.entryRow}>
            <TouchableOpacity
              onPress={() => updateEntry(member.id, { played: !entry.played })}
              style={[styles.playedBox, entry.played && styles.playedBoxOn]}
            >
              {entry.played && <Text style={styles.playedCheck}>✓</Text>}
            </TouchableOpacity>
            <Text
              style={[styles.entryName, !entry.played && { opacity: 0.4 }]}
              numberOfLines={1}
            >
              {member.username}
            </Text>
            {entry.played && (
              <>
                <Stepper
                  label="G"
                  value={entry.goals}
                  onChange={(goals) => updateEntry(member.id, { goals })}
                />
                <Stepper
                  label="A"
                  value={entry.assists}
                  onChange={(assists) => updateEntry(member.id, { assists })}
                />
                <TouchableOpacity
                  onPress={() => updateEntry(member.id, { motm: !entry.motm })}
                  style={[styles.motm, entry.motm && styles.motmOn]}
                >
                  <Text style={{ fontSize: 12 }}>⭐</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        );
      })}
    </Card>
  );

  return (
    <KeyboardAwareScroll contentContainerStyle={styles.content}>
      <Card style={styles.headerCard}>
        <Text style={styles.vs}>
          {match.home.name}  vs  {match.away.name}
        </Text>
        {match.status === "completed" ? (
          <Text style={styles.score}>
            {match.home_score} – {match.away_score}
          </Text>
        ) : (
          <Text style={styles.kickoff}>
            {kickoff.toLocaleDateString(undefined, {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}{" "}
            {kickoff.toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        )}
        {match.location ? (
          <Text style={styles.location}>{match.location}</Text>
        ) : null}
        <Text style={styles.status}>{match.status.toUpperCase()}</Text>
      </Card>

      {/* Away captain decides on proposals they received */}
      {match.status === "proposed" && isAwayCaptain && (
        <View style={styles.actions}>
          <Button
            title="Accept"
            onPress={() => setStatus("accepted")}
            loading={busy}
            style={{ flex: 1 }}
          />
          <Button
            title="Decline"
            onPress={() => setStatus("declined")}
            variant="danger"
            loading={busy}
            style={{ flex: 1 }}
          />
        </View>
      )}
      {match.status === "proposed" && !isAwayCaptain && (
        <Text style={styles.hint}>
          Waiting for {match.away.name}'s captain to respond.
        </Text>
      )}

      {/* Result entry for captains */}
      {(match.status === "accepted" || match.status === "completed") &&
        isCaptain &&
        !editing && (
          <Button
            title={match.status === "completed" ? "Edit Result" : "Enter Result"}
            onPress={startEditing}
            variant={match.status === "completed" ? "secondary" : "primary"}
          />
        )}

      {editing && (
        <>
          <Card style={{ gap: 10 }}>
            <SectionTitle>Final score</SectionTitle>
            <View style={styles.scoreRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.scoreLabel}>{match.home.name}</Text>
                <Input
                  value={homeScore}
                  onChangeText={setHomeScore}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scoreLabel}>{match.away.name}</Text>
                <Input
                  value={awayScore}
                  onChangeText={setAwayScore}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              </View>
            </View>
          </Card>
          {renderEntryRows(match.home, homeMembers)}
          {renderEntryRows(match.away, awayMembers)}
          <View style={styles.actions}>
            <Button
              title="Save Result"
              onPress={saveResult}
              loading={busy}
              style={{ flex: 1 }}
            />
            <Button
              title="Cancel"
              onPress={() => setEditing(false)}
              variant="secondary"
              style={{ flex: 1 }}
            />
          </View>
        </>
      )}

      {/* Completed: player stats */}
      {match.status === "completed" && !editing && (
        <>
          {renderStatsTable(match.home, homeMembers)}
          {renderStatsTable(match.away, awayMembers)}
        </>
      )}
    </KeyboardAwareScroll>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        onPress={() => onChange(Math.max(0, value - 1))}
        hitSlop={8}
      >
        <Text style={styles.stepBtn}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepValue}>
        {value}
        <Text style={styles.stepLabel}>{label}</Text>
      </Text>
      <TouchableOpacity onPress={() => onChange(value + 1)} hitSlop={8}>
        <Text style={styles.stepBtn}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  headerCard: { alignItems: "center", gap: 6 },
  vs: { color: colors.text, fontSize: 18, fontWeight: "800", textAlign: "center" },
  score: { color: colors.accent, fontSize: 36, fontWeight: "800" },
  kickoff: { color: colors.text, fontSize: 15, fontWeight: "600" },
  location: { color: colors.textMuted, fontSize: 13 },
  status: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  actions: { flexDirection: "row", gap: 10 },
  hint: { color: colors.textMuted, textAlign: "center" },
  scoreRow: { flexDirection: "row", gap: 12 },
  scoreLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  entryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  playedBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  playedBoxOn: { borderColor: colors.accent, backgroundColor: "#12291c" },
  playedCheck: { color: colors.accent, fontSize: 13, fontWeight: "800" },
  entryName: { color: colors.text, fontWeight: "600", flex: 1, fontSize: 13 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: "800",
    paddingHorizontal: 4,
  },
  stepValue: { color: colors.text, fontWeight: "800", minWidth: 26, textAlign: "center" },
  stepLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "600" },
  motm: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.35,
  },
  motmOn: { borderColor: colors.warning, opacity: 1 },
  statLine: { flexDirection: "row", justifyContent: "space-between" },
  statName: { color: colors.text, fontWeight: "600" },
  statNums: { color: colors.textMuted, fontWeight: "700" },
});
