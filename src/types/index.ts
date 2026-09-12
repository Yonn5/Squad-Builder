import type { Position } from "../constants/positions";

export type Stats = {
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
};

export type StatKey = keyof Stats;

/**
 * Goalkeeper face stats, mirroring how FC-style GK cards are rated:
 * diving, handling, kicking, reflexes, speed, positioning. Kept in their
 * own columns so switching position never scrambles the outfield stats.
 */
export type GkStats = {
  gk_div: number;
  gk_han: number;
  gk_kic: number;
  gk_ref: number;
  gk_spd: number;
  gk_pos: number;
};

export type GkStatKey = keyof GkStats;

export type Profile = Stats & GkStats & {
  id: string;
  username: string;
  position: Position;
  nationality: string;
  playstyles: string[];
  created_at: string;
  updated_at: string;
};

export type Team = {
  id: string;
  name: string;
  captain_id: string;
  join_code: string;
  created_at: string;
};

export type TeamMember = {
  team_id: string;
  user_id: string;
  joined_at: string;
};

export type Lineup = {
  id: string;
  team_id: string;
  name: string;
  formation: string;
  size: 6 | 10;
  created_at: string;
};

export type LineupSlot = {
  id: string;
  lineup_id: string;
  slot_index: number;
  position: Position;
  player_id: string | null;
};

export type MatchStatus = "proposed" | "accepted" | "declined" | "completed";

export type Match = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  created_by: string;
  kickoff_at: string;
  location: string | null;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  created_at: string;
};

export type MatchPlayerStats = {
  id: string;
  match_id: string;
  team_id: string;
  player_id: string;
  goals: number;
  assists: number;
  motm: boolean;
};

export type PlayerRecord = {
  apps: number;
  goals: number;
  assists: number;
  motm: number;
  wins: number;
  draws: number;
  losses: number;
};
