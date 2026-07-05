import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
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
} from "../../../src/components/ui";
import { supabase } from "../../../src/lib/supabase";
import { useUserId } from "../../../src/providers/AuthProvider";
import { colors } from "../../../src/theme";
import type { Match, Team } from "../../../src/types";

type MatchWithTeams = Match & { home: Team; away: Team };

const STATUS_COLORS: Record<Match["status"], string> = {
  proposed: colors.warning,
  accepted: colors.accent,
  declined: colors.danger,
  completed: colors.textMuted,
};

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function FixturesScreen() {
  const userId = useUserId();
  const [matches, setMatches] = useState<MatchWithTeams[] | null>(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const load = useCallback(async () => {
    const { data: memberships } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", userId);
    const teamIds = (memberships ?? []).map((row) => row.team_id);
    if (teamIds.length === 0) {
      setMatches([]);
      return;
    }
    const idList = `(${teamIds.join(",")})`;
    const { data } = await supabase
      .from("matches")
      .select("*, home:teams!matches_home_team_id_fkey(*), away:teams!matches_away_team_id_fkey(*)")
      .or(`home_team_id.in.${idList},away_team_id.in.${idList}`)
      .order("kickoff_at");
    setMatches((data ?? []) as MatchWithTeams[]);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const matchDays = useMemo(() => {
    const days = new Map<string, number>();
    for (const match of matches ?? []) {
      const key = dayKey(new Date(match.kickoff_at));
      days.set(key, (days.get(key) ?? 0) + 1);
    }
    return days;
  }, [matches]);

  if (matches === null) return <Loading />;

  const changeMonth = (delta: number) =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  // Build the month grid: leading blanks + days.
  const firstWeekday = (month.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const cells: (Date | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1),
    ),
  ];
  const todayKey = dayKey(new Date());

  const upcoming = matches.filter((m) => m.status !== "declined");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)} hitSlop={12}>
            <Text style={styles.monthArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {month.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </Text>
          <TouchableOpacity onPress={() => changeMonth(1)} hitSlop={12}>
            <Text style={styles.monthArrow}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.weekRow}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <Text key={i} style={styles.weekday}>
              {d}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {cells.map((date, i) => {
            const key = date ? dayKey(date) : "";
            const hasMatch = date ? matchDays.has(key) : false;
            const isToday = key === todayKey;
            return (
              <View key={i} style={styles.cell}>
                {date && (
                  <View style={[styles.day, isToday && styles.today]}>
                    <Text
                      style={[styles.dayText, isToday && { color: "#08351d" }]}
                    >
                      {date.getDate()}
                    </Text>
                    {hasMatch && <View style={styles.dot} />}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </Card>

      <Button title="Schedule a Match" onPress={() => router.push("/fixtures/new")} />

      <SectionTitle>All fixtures</SectionTitle>
      {upcoming.length === 0 ? (
        <EmptyState text="No fixtures yet. Captains can schedule matches against other teams." />
      ) : (
        upcoming.map((match) => {
          const date = new Date(match.kickoff_at);
          return (
            <TouchableOpacity
              key={match.id}
              onPress={() => router.push(`/fixtures/${match.id}`)}
            >
              <Card style={styles.matchRow}>
                <View style={styles.matchDate}>
                  <Text style={styles.matchDay}>{date.getDate()}</Text>
                  <Text style={styles.matchMonth}>
                    {date.toLocaleDateString(undefined, { month: "short" })}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.matchTeams} numberOfLines={1}>
                    {match.home.name} vs {match.away.name}
                  </Text>
                  <Text style={styles.matchMeta}>
                    {match.status === "completed"
                      ? `FT ${match.home_score}–${match.away_score}`
                      : date.toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) + (match.location ? ` · ${match.location}` : "")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    { borderColor: STATUS_COLORS[match.status] },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: STATUS_COLORS[match.status] },
                    ]}
                  >
                    {match.status.toUpperCase()}
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  monthTitle: { color: colors.text, fontWeight: "700", fontSize: 16 },
  monthArrow: { color: colors.accent, fontSize: 26, paddingHorizontal: 10 },
  weekRow: { flexDirection: "row", marginBottom: 4 },
  weekday: {
    flex: 1,
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  day: { alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 16 },
  today: { backgroundColor: colors.accent },
  dayText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  dot: {
    position: "absolute",
    bottom: 2,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.warning,
  },
  matchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  matchDate: { alignItems: "center", width: 40 },
  matchDay: { color: colors.text, fontSize: 18, fontWeight: "800" },
  matchMonth: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  matchTeams: { color: colors.text, fontWeight: "700", fontSize: 14 },
  matchMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  statusPill: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
});
