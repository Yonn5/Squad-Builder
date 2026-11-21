import type { PlayerRecord } from "../types";
import { supabase } from "./supabase";

/**
 * A player's career record across every completed fixture with a score:
 * appearances, goals, assists, man-of-the-match awards and results.
 * Returns null if the stats could not be loaded.
 */
export async function fetchPlayerRecord(
  playerId: string,
): Promise<PlayerRecord | null> {
  const { data: rows, error } = await supabase
    .from("match_player_stats")
    .select(
      "goals, assists, motm, team_id, matches!inner(status, home_team_id, home_score, away_score)",
    )
    .eq("player_id", playerId)
    .eq("matches.status", "completed");
  if (error || !rows) return null;

  const record: PlayerRecord = {
    apps: 0, goals: 0, assists: 0, motm: 0, wins: 0, draws: 0, losses: 0,
  };
  for (const row of rows as any[]) {
    const match = row.matches;
    if (match.home_score == null || match.away_score == null) continue;
    record.apps += 1;
    record.goals += row.goals;
    record.assists += row.assists;
    if (row.motm) record.motm += 1;
    const isHome = row.team_id === match.home_team_id;
    const mine = isHome ? match.home_score : match.away_score;
    const theirs = isHome ? match.away_score : match.home_score;
    if (mine > theirs) record.wins += 1;
    else if (mine === theirs) record.draws += 1;
    else record.losses += 1;
  }
  return record;
}
