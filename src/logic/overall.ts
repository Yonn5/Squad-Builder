import { POSITION_WEIGHTS, type Position } from "../constants/positions";
import type { GkStatKey, GkStats, Stats, StatKey } from "../types";

export const STAT_KEYS: StatKey[] = ["pac", "sho", "pas", "dri", "def", "phy"];

export const STAT_LABELS: Record<StatKey, string> = {
  pac: "PAC",
  sho: "SHO",
  pas: "PAS",
  dri: "DRI",
  def: "DEF",
  phy: "PHY",
};

export const GK_STAT_KEYS: GkStatKey[] = [
  "gk_div",
  "gk_han",
  "gk_kic",
  "gk_ref",
  "gk_spd",
  "gk_pos",
];

export const GK_STAT_LABELS: Record<GkStatKey, string> = {
  gk_div: "DIV",
  gk_han: "HAN",
  gk_kic: "KIC",
  gk_ref: "REF",
  gk_spd: "SPD",
  gk_pos: "POS",
};

export const GK_STAT_NAMES: Record<GkStatKey, string> = {
  gk_div: "Diving",
  gk_han: "Handling",
  gk_kic: "Kicking",
  gk_ref: "Reflexes",
  gk_spd: "Speed",
  gk_pos: "Positioning",
};

/** Shot-stopping dominates; kicking and speed are minor. Sums to 1. */
export const GK_WEIGHTS: Record<GkStatKey, number> = {
  gk_div: 0.22,
  gk_han: 0.21,
  gk_kic: 0.05,
  gk_ref: 0.23,
  gk_spd: 0.05,
  gk_pos: 0.24,
};

/** Position-weighted average of the six outfield stats, rounded. */
export function calcOverall(stats: Stats, position: Position): number {
  const weights = POSITION_WEIGHTS[position];
  const total = STAT_KEYS.reduce(
    (sum, key) => sum + stats[key] * weights[key],
    0,
  );
  return Math.round(total);
}

/** Weighted average of the six goalkeeper stats, rounded. */
export function calcGkOverall(stats: GkStats): number {
  const total = GK_STAT_KEYS.reduce(
    (sum, key) => sum + stats[key] * GK_WEIGHTS[key],
    0,
  );
  return Math.round(total);
}

/** Picks the right formula for the player's position. */
export function overallFor(player: Stats & GkStats & { position: Position }): number {
  return player.position === "GK"
    ? calcGkOverall(player)
    : calcOverall(player, player.position);
}

export type CardTier = "bronze" | "silver" | "gold";

export function tierFor(overall: number): CardTier {
  if (overall >= 75) return "gold";
  if (overall >= 65) return "silver";
  return "bronze";
}
