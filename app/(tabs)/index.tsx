import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PlayerCard } from "../../src/components/PlayerCard";
import { PlaystylePicker } from "../../src/components/PlaystylePicker";
import { PositionPicker } from "../../src/components/PositionPicker";
import { StatSlider } from "../../src/components/StatSlider";
import {
  Button,
  Card,
  Input,
  KeyboardAwareScroll,
  Label,
  Loading,
  SectionTitle,
} from "../../src/components/ui";
import { COUNTRIES } from "../../src/constants/countries";
import type { Position } from "../../src/constants/positions";
import { showAlert } from "../../src/lib/alert";
import { supabase } from "../../src/lib/supabase";
import {
  GK_STAT_KEYS,
  GK_STAT_LABELS,
  GK_STAT_NAMES,
  STAT_KEYS,
  STAT_LABELS,
} from "../../src/logic/overall";
import { useUserId } from "../../src/providers/AuthProvider";
import { colors } from "../../src/theme";
import type { GkStats, PlayerRecord, Profile, Stats } from "../../src/types";

const DEFAULT_STATS: Stats = { pac: 70, sho: 70, pas: 70, dri: 70, def: 70, phy: 70 };

const DEFAULT_GK_STATS: GkStats = {
  gk_div: 70,
  gk_han: 70,
  gk_kic: 70,
  gk_ref: 70,
  gk_spd: 70,
  gk_pos: 70,
};

export default function MyCardScreen() {
  const userId = useUserId();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [position, setPosition] = useState<Position>("ST");
  const [nationality, setNationality] = useState("");
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [gkStats, setGkStats] = useState<GkStats>(DEFAULT_GK_STATS);
  const [playstyles, setPlaystyles] = useState<string[]>([]);
  const [record, setRecord] = useState<PlayerRecord | null>(null);

  const isGk = position === "GK";

  const load = useCallback(async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single<Profile>();
    if (profile) {
      setUsername(profile.username);
      setPosition(profile.position);
      setNationality(profile.nationality ?? "");
      setStats({
        pac: profile.pac,
        sho: profile.sho,
        pas: profile.pas,
        dri: profile.dri,
        def: profile.def,
        phy: profile.phy,
      });
      setGkStats({
        gk_div: profile.gk_div ?? 70,
        gk_han: profile.gk_han ?? 70,
        gk_kic: profile.gk_kic ?? 70,
        gk_ref: profile.gk_ref ?? 70,
        gk_spd: profile.gk_spd ?? 70,
        gk_pos: profile.gk_pos ?? 70,
      });
      setPlaystyles(profile.playstyles);
    }

    // Career record from completed matches
    const { data: rows } = await supabase
      .from("match_player_stats")
      .select(
        "goals, assists, motm, team_id, matches!inner(status, home_team_id, home_score, away_score)",
      )
      .eq("player_id", userId)
      .eq("matches.status", "completed");
    if (rows) {
      const rec: PlayerRecord = {
        apps: 0, goals: 0, assists: 0, motm: 0, wins: 0, draws: 0, losses: 0,
      };
      for (const row of rows as any[]) {
        const match = row.matches;
        if (match.home_score == null || match.away_score == null) continue;
        rec.apps += 1;
        rec.goals += row.goals;
        rec.assists += row.assists;
        if (row.motm) rec.motm += 1;
        const isHome = row.team_id === match.home_team_id;
        const my = isHome ? match.home_score : match.away_score;
        const their = isHome ? match.away_score : match.home_score;
        if (my > their) rec.wins += 1;
        else if (my === their) rec.draws += 1;
        else rec.losses += 1;
      }
      setRecord(rec);
    }
    setLoaded(true);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.trim(),
        position,
        nationality,
        ...stats,
        ...gkStats,
        playstyles,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) showAlert("Save failed", error.message);
    else showAlert("Saved", "Your card has been updated.");
  };

  const signOut = () => supabase.auth.signOut();

  if (!loaded) {
    return (
      <SafeAreaView style={styles.screen}>
        <Loading />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <KeyboardAwareScroll contentContainerStyle={styles.content}>
        <View style={styles.cardWrap}>
          <PlayerCard
            name={username}
            position={position}
            stats={stats}
            gkStats={gkStats}
            playstyles={playstyles}
            nationality={nationality}
          />
        </View>

        <Card style={styles.section}>
          <SectionTitle>Player</SectionTitle>
          <Label>Name</Label>
          <Input value={username} onChangeText={setUsername} maxLength={24} />
          <Label>Position</Label>
          <PositionPicker value={position} onChange={setPosition} />
          <Label>Nationality</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {COUNTRIES.map((country) => (
                <TouchableOpacity
                  key={country.name}
                  onPress={() =>
                    setNationality(nationality === country.name ? "" : country.name)
                  }
                  style={[
                    styles.posChip,
                    nationality === country.name && styles.posChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.posChipText,
                      nationality === country.name && styles.posChipTextActive,
                    ]}
                  >
                    {country.flag} {country.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Card>

        <Card style={styles.section}>
          <SectionTitle>{isGk ? "Goalkeeper Stats" : "Stats"}</SectionTitle>
          {isGk
            ? GK_STAT_KEYS.map((key) => (
                <StatSlider
                  key={key}
                  label={GK_STAT_LABELS[key]}
                  hint={GK_STAT_NAMES[key]}
                  value={gkStats[key]}
                  onChange={(value) => setGkStats((g) => ({ ...g, [key]: value }))}
                />
              ))
            : STAT_KEYS.map((key) => (
                <StatSlider
                  key={key}
                  label={STAT_LABELS[key]}
                  value={stats[key]}
                  onChange={(value) => setStats((s) => ({ ...s, [key]: value }))}
                />
              ))}
        </Card>

        <Card style={styles.section}>
          <SectionTitle>PlayStyles+</SectionTitle>
          <PlaystylePicker selected={playstyles} onChange={setPlaystyles} />
        </Card>

        {record && record.apps > 0 && (
          <Card style={styles.section}>
            <SectionTitle>Career Record</SectionTitle>
            <View style={styles.recordRow}>
              <RecordStat label="Apps" value={record.apps} />
              <RecordStat label="Goals" value={record.goals} />
              <RecordStat label="Assists" value={record.assists} />
              <RecordStat label="MOTM" value={record.motm} />
            </View>
            <Text style={styles.wdl}>
              W {record.wins} · D {record.draws} · L {record.losses}
            </Text>
          </Card>
        )}

        <Button
          title="Save Card"
          onPress={save}
          loading={saving}
          disabled={username.trim().length < 2}
        />
        <Button title="Sign Out" onPress={signOut} variant="secondary" />
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

function RecordStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={styles.recordValue}>{value}</Text>
      <Text style={styles.recordLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14 },
  cardWrap: { alignItems: "center", paddingVertical: 8 },
  section: { gap: 8 },
  chipRow: { flexDirection: "row", flexWrap: "nowrap", gap: 8 },
  posChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  posChipActive: { borderColor: colors.accent, backgroundColor: "#12291c" },
  posChipText: { color: colors.textMuted, fontWeight: "700", fontSize: 13 },
  posChipTextActive: { color: colors.accent },
  recordRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 6,
  },
  recordValue: { color: colors.text, fontSize: 22, fontWeight: "800" },
  recordLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  wdl: {
    color: colors.textMuted,
    textAlign: "center",
    fontWeight: "700",
    marginTop: 4,
  },
});
