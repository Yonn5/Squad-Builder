import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PlayerCard } from "../../../../../src/components/PlayerCard";
import { PlaystyleBadge } from "../../../../../src/components/PlaystyleBadge";
import {
  Button,
  Card,
  EmptyState,
  Loading,
  SectionTitle,
} from "../../../../../src/components/ui";
import { flagFor } from "../../../../../src/constants/countries";
import { POSITION_NAMES } from "../../../../../src/constants/positions";
import { confirmDialog, showAlert } from "../../../../../src/lib/alert";
import { isCutOutUrl } from "../../../../../src/lib/photoStorage";
import { fetchPlayerRecord } from "../../../../../src/lib/playerRecord";
import { supabase, TEAM_COLUMNS } from "../../../../../src/lib/supabase";
import { overallFor, tierFor } from "../../../../../src/logic/overall";
import { useUserId } from "../../../../../src/providers/AuthProvider";
import { colors } from "../../../../../src/theme";
import type { PlayerRecord, Profile, Team } from "../../../../../src/types";

/**
 * A team-mate's card, PlayStyles+ and career record, opened from the squad.
 * The captain can kick the player from here.
 */
export default function PlayerScreen() {
  // `slot` is set when opened from a lineup: the slot this player holds.
  const {
    id,
    playerId,
    slot: slotId,
  } = useLocalSearchParams<{
    id: string;
    playerId: string;
    slot?: string;
  }>();
  const userId = useUserId();
  const [team, setTeam] = useState<Team | null>(null);
  const [player, setPlayer] = useState<Profile | null>(null);
  const [record, setRecord] = useState<PlayerRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [slot, setSlot] = useState<{
    id: string;
    position: string;
    lineup: string;
  } | null>(null);
  // "gone": the player is no longer in this team (kicked or left).
  const [problem, setProblem] = useState<"gone" | "failed" | null>(null);

  const load = useCallback(async () => {
    const [teamRes, memberRes, rec] = await Promise.all([
      supabase
        .from("teams")
        .select(TEAM_COLUMNS)
        .eq("id", id)
        .maybeSingle<Team>(),
      supabase
        .from("team_members")
        .select("profiles(*)")
        .eq("team_id", id)
        .eq("user_id", playerId)
        .maybeSingle(),
      fetchPlayerRecord(playerId),
    ]);
    if (slotId) {
      const { data } = await supabase
        .from("lineup_slots")
        .select("id, position, player_id, lineups(name)")
        .eq("id", slotId)
        .maybeSingle();
      const row = data as {
        id: string;
        position: string;
        player_id: string | null;
        lineups: { name: string } | null;
      } | null;
      // Only while they still hold it: it may have been left or cleared since.
      setSlot(
        row && row.player_id === playerId
          ? {
              id: row.id,
              position: row.position,
              lineup: row.lineups?.name ?? "this lineup",
            }
          : null,
      );
    }
    if (teamRes.error || memberRes.error) {
      setProblem("failed");
      return;
    }
    const profile = (memberRes.data as { profiles: Profile } | null)?.profiles;
    if (!teamRes.data || !profile) {
      setProblem("gone");
      return;
    }
    setProblem(null);
    setTeam(teamRes.data);
    setPlayer(profile);
    setRecord(rec);
  }, [id, playerId, slotId]);

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
            problem === "gone"
              ? "This player is no longer in the team."
              : "Couldn't load this player. Check your connection and try again."
          }
        />
        <Button title="Back to Squad" onPress={() => router.back()} />
      </View>
    );
  }
  if (!team || !player) return <Loading />;

  const isCaptain = team.captain_id === userId;
  const flag = flagFor(player.nationality ?? "");
  const gkStats = {
    gk_div: player.gk_div ?? 70,
    gk_han: player.gk_han ?? 70,
    gk_kic: player.gk_kic ?? 70,
    gk_ref: player.gk_ref ?? 70,
    gk_spd: player.gk_spd ?? 70,
    gk_pos: player.gk_pos ?? 70,
  };

  const isMe = player.id === userId;

  const freeSlot = async () => {
    if (!slot) return;
    const ok = await confirmDialog(
      isMe ? "Leave position?" : "Captain action",
      isMe
        ? `Give up the ${slot.position} slot?`
        : `Remove ${player.username} from ${slot.position}?`,
      isMe ? "Leave" : "Remove",
    );
    if (!ok) return;
    setBusy(true);
    const { error } = await supabase
      .from("lineup_slots")
      .update({ player_id: null })
      .eq("id", slot.id);
    setBusy(false);
    if (error) showAlert("Could not update slot", error.message);
    else router.back();
  };

  const kick = async () => {
    if (
      !(await confirmDialog(
        "Kick player",
        `Kick ${player.username} out of ${team.name}? Their card and career stats are not affected.`,
        "Kick",
      ))
    )
      return;
    setBusy(true);
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", team.id)
      .eq("user_id", player.id);
    setBusy(false);
    if (error) showAlert("Could not kick player", error.message);
    else router.back();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.cardWrap}>
        <PlayerCard
          name={player.username}
          position={player.position}
          stats={{
            pac: player.pac,
            sho: player.sho,
            pas: player.pas,
            dri: player.dri,
            def: player.def,
            phy: player.phy,
          }}
          gkStats={gkStats}
          playstyles={player.playstyles}
          nationality={player.nationality ?? ""}
          photoUri={player.photo_url ?? undefined}
          photoCutOut={
            player.photo_url ? isCutOutUrl(player.photo_url) : undefined
          }
        />
      </View>

      {slot ? (
        <Card style={styles.section}>
          <SectionTitle>Lineup</SectionTitle>
          <Text style={styles.empty}>
            Playing {slot.position} in {slot.lineup}.
          </Text>
          {isMe || isCaptain ? (
            <Button
              title={
                isMe ? `Leave ${slot.position}` : `Remove from ${slot.position}`
              }
              onPress={freeSlot}
              variant="secondary"
              loading={busy}
            />
          ) : null}
        </Card>
      ) : null}

      <Card style={styles.section}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Position</Text>
          <Text style={styles.summaryValue}>
            {POSITION_NAMES[player.position]} ({player.position})
          </Text>
        </View>
        {flag ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Nationality</Text>
            <Text style={styles.summaryValue}>
              {flag} {player.nationality}
            </Text>
          </View>
        ) : null}
        {player.id === team.captain_id ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Role</Text>
            <Text style={styles.summaryValue}>Captain ©</Text>
          </View>
        ) : null}
      </Card>

      <Card style={styles.section}>
        <SectionTitle>PlayStyles+</SectionTitle>
        {player.playstyles.length ? (
          <View style={styles.playstyles}>
            {player.playstyles.map((name) => (
              <View key={name} style={styles.playstyle}>
                <PlaystyleBadge
                  name={name}
                  size={26}
                  tier={tierFor(overallFor({ ...player, ...gkStats }))}
                />
                <Text style={styles.playstyleName}>{name}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>No PlayStyles+ picked yet.</Text>
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
          </>
        ) : (
          <Text style={styles.empty}>
            {record
              ? "No completed matches yet."
              : "Couldn't load the career record."}
          </Text>
        )}
      </Card>

      {isCaptain && player.id !== userId ? (
        <Button
          title="Kick from Team"
          onPress={kick}
          variant="danger"
          loading={busy}
        />
      ) : null}
    </ScrollView>
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
  problem: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  cardWrap: { alignItems: "center", paddingVertical: 8 },
  section: { gap: 8 },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 30,
  },
  summaryLabel: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  summaryValue: { color: colors.text, fontSize: 14, fontWeight: "700" },
  playstyles: { gap: 10 },
  playstyle: { flexDirection: "row", alignItems: "center", gap: 10 },
  playstyleName: { color: colors.text, fontSize: 14, fontWeight: "600" },
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
  empty: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
});
