import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PhotoField, type CardPhoto } from "../../src/components/PhotoField";
import { PlayerCard } from "../../src/components/PlayerCard";
import { PlaystyleBadge } from "../../src/components/PlaystyleBadge";
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
import { COUNTRIES, flagFor } from "../../src/constants/countries";
import { POSITION_NAMES, type Position } from "../../src/constants/positions";
import { confirmDialog, showAlert } from "../../src/lib/alert";
import {
  deletePlayerPhoto,
  uploadPlayerPhoto,
} from "../../src/lib/photoStorage";
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

/** Everything on the card that a player can edit. */
type CardDraft = {
  username: string;
  position: Position;
  nationality: string;
  stats: Stats;
  gkStats: GkStats;
  playstyles: string[];
  photo: CardPhoto | null;
};

const EMPTY_DRAFT: CardDraft = {
  username: "",
  position: "ST",
  nationality: "",
  stats: { pac: 70, sho: 70, pas: 70, dri: 70, def: 70, phy: 70 },
  gkStats: {
    gk_div: 70, gk_han: 70, gk_kic: 70, gk_ref: 70, gk_spd: 70, gk_pos: 70,
  },
  playstyles: [],
  photo: null,
};

export default function MyCardScreen() {
  const userId = useUserId();
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  // `draft` is what the card previews; `saved` is what's in the database, so
  // Cancel can put everything back.
  const [draft, setDraft] = useState<CardDraft>(EMPTY_DRAFT);
  const [saved, setSaved] = useState<CardDraft>(EMPTY_DRAFT);
  const [record, setRecord] = useState<PlayerRecord | null>(null);

  const isGk = draft.position === "GK";
  const patch = (changes: Partial<CardDraft>) =>
    setDraft((d) => ({ ...d, ...changes }));

  const load = useCallback(async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single<Profile>();
    if (profile) {
      const next: CardDraft = {
        username: profile.username,
        position: profile.position,
        nationality: profile.nationality ?? "",
        stats: {
          pac: profile.pac, sho: profile.sho, pas: profile.pas,
          dri: profile.dri, def: profile.def, phy: profile.phy,
        },
        gkStats: {
          gk_div: profile.gk_div ?? 70, gk_han: profile.gk_han ?? 70,
          gk_kic: profile.gk_kic ?? 70, gk_ref: profile.gk_ref ?? 70,
          gk_spd: profile.gk_spd ?? 70, gk_pos: profile.gk_pos ?? 70,
        },
        playstyles: profile.playstyles,
        photo: profile.photo_url ? { uri: profile.photo_url } : null,
      };
      setDraft(next);
      setSaved(next);
    }

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
      // Don't clobber unsaved edits when the tab regains focus.
      if (!editing) load();
    }, [load, editing]),
  );

  const save = async () => {
    setBusy(true);

    // A photo picked in this session still only exists on the device, so it
    // has to reach Storage before the profile can point at it.
    let photoUrl = draft.photo?.uri ?? null;
    if (draft.photo?.data) {
      try {
        photoUrl = await uploadPlayerPhoto(userId, draft.photo.data);
      } catch (error) {
        setBusy(false);
        showAlert("Photo upload failed", describeUploadError(error));
        return;
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        username: draft.username.trim(),
        position: draft.position,
        nationality: draft.nationality,
        ...draft.stats,
        ...draft.gkStats,
        playstyles: draft.playstyles,
        photo_url: photoUrl,
      })
      .eq("id", userId);
    setBusy(false);
    if (error) {
      showAlert("Save failed", error.message);
      return;
    }

    const previousUrl = saved.photo?.uri ?? null;
    if (previousUrl && previousUrl !== photoUrl) {
      // The card is already saved; a leftover file is not worth a failure.
      deletePlayerPhoto(previousUrl).catch(() => {});
    }

    const trimmed: CardDraft = {
      ...draft,
      username: draft.username.trim(),
      photo: photoUrl ? { uri: photoUrl } : null,
    };
    setDraft(trimmed);
    setSaved(trimmed);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(saved);
    setEditing(false);
  };

  const resetGoalContributions = async () => {
    if (
      !(await confirmDialog(
        "Reset goals & assists",
        "Set your goals, assists and MOTM awards back to zero across every match? Appearances and your W-D-L record are kept.",
        "Reset",
      ))
    )
      return;
    setBusy(true);
    const { error } = await supabase.rpc("reset_my_goal_contributions");
    setBusy(false);
    if (error) showAlert("Could not reset", error.message);
    else {
      showAlert("Reset", "Your goals and assists are back to zero.");
      load();
    }
  };

  if (!loaded) {
    return (
      <SafeAreaView style={styles.screen}>
        <Loading />
      </SafeAreaView>
    );
  }

  const flag = flagFor(draft.nationality);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <KeyboardAwareScroll contentContainerStyle={styles.content}>
        <View style={styles.cardWrap}>
          <PlayerCard
            name={draft.username}
            position={draft.position}
            stats={draft.stats}
            gkStats={draft.gkStats}
            playstyles={draft.playstyles}
            nationality={draft.nationality}
            photoUri={draft.photo?.uri}
          />
        </View>

        {editing ? (
          <>
            <Card style={styles.section}>
              <SectionTitle>Player</SectionTitle>
              <Label>Name</Label>
              <Input
                value={draft.username}
                onChangeText={(username) => patch({ username })}
                maxLength={24}
              />
              <Label>Photo</Label>
              <PhotoField
                value={draft.photo}
                onChange={(photo) => patch({ photo })}
              />
              <Label>Position</Label>
              <PositionPicker
                value={draft.position}
                onChange={(position) => patch({ position })}
              />
              <Label>Nationality</Label>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {COUNTRIES.map((country) => {
                    const active = draft.nationality === country.name;
                    return (
                      <TouchableOpacity
                        key={country.name}
                        onPress={() =>
                          patch({ nationality: active ? "" : country.name })
                        }
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text
                          style={[styles.chipText, active && styles.chipTextActive]}
                        >
                          {country.flag} {country.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
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
                      value={draft.gkStats[key]}
                      onChange={(value) =>
                        patch({ gkStats: { ...draft.gkStats, [key]: value } })
                      }
                    />
                  ))
                : STAT_KEYS.map((key) => (
                    <StatSlider
                      key={key}
                      label={STAT_LABELS[key]}
                      value={draft.stats[key]}
                      onChange={(value) =>
                        patch({ stats: { ...draft.stats, [key]: value } })
                      }
                    />
                  ))}
            </Card>

            <Card style={styles.section}>
              <SectionTitle>PlayStyles+</SectionTitle>
              <PlaystylePicker
                selected={draft.playstyles}
                onChange={(playstyles) => patch({ playstyles })}
              />
            </Card>

            <Button
              title="Save Card"
              onPress={save}
              loading={busy}
              disabled={draft.username.trim().length < 2}
            />
            <Button title="Cancel" onPress={cancel} variant="secondary" />
          </>
        ) : (
          <>
            <Card style={styles.section}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Position</Text>
                <Text style={styles.summaryValue}>
                  {POSITION_NAMES[draft.position]} ({draft.position})
                </Text>
              </View>
              {flag ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Nationality</Text>
                  <Text style={styles.summaryValue}>
                    {flag} {draft.nationality}
                  </Text>
                </View>
              ) : null}
              {draft.playstyles.length > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>PlayStyles+</Text>
                  <View style={styles.badgeRow}>
                    {draft.playstyles.map((p) => (
                      <PlaystyleBadge key={p} name={p} size={26} />
                    ))}
                  </View>
                </View>
              )}
            </Card>

            <Card style={styles.section}>
              <SectionTitle>Career Record</SectionTitle>
              {record && record.apps > 0 ? (
                <>
                  <View style={styles.recordRow}>
                    <RecordStat label="Apps" value={record.apps} />
                    <RecordStat label="Goals" value={record.goals} />
                    <RecordStat label="Assists" value={record.assists} />
                    <RecordStat label="MOTM" value={record.motm} />
                  </View>
                  <Text style={styles.wdl}>
                    W {record.wins} · D {record.draws} · L {record.losses}
                  </Text>
                  <Button
                    title="Reset Goals & Assists"
                    onPress={resetGoalContributions}
                    variant="secondary"
                    loading={busy}
                  />
                </>
              ) : (
                <Text style={styles.empty}>
                  No completed matches yet. Goals and assists appear here once a
                  captain records a result.
                </Text>
              )}
            </Card>

            <Button title="Edit Card" onPress={() => setEditing(true)} />
            <Button
              title="Sign Out"
              onPress={() => supabase.auth.signOut()}
              variant="secondary"
            />
          </>
        )}
      </KeyboardAwareScroll>
    </SafeAreaView>
  );
}

/** Storage errors are opaque; the one worth naming is a missing bucket. */
function describeUploadError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/bucket not found/i.test(message))
    return "Photo storage isn't set up on this project yet. Run the latest database migration, then try again.";
  if (/exceeded the maximum allowed size|payload too large/i.test(message))
    return "That photo is too large. Try a smaller one.";
  return message || "The photo could not be uploaded. Try again.";
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
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: "#12291c" },
  chipText: { color: colors.textMuted, fontWeight: "700", fontSize: 13 },
  chipTextActive: { color: colors.accent },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 30,
  },
  summaryLabel: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  summaryValue: { color: colors.text, fontSize: 14, fontWeight: "700" },
  badgeRow: { flexDirection: "row", gap: 6 },
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
    marginBottom: 4,
  },
  empty: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
});
