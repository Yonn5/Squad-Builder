import { POSITION_WEIGHTS, type Position } from "../constants/positions";
import type { Stats, StatKey } from "../types";

export const STAT_KEYS: StatKey[] = ["pac", "sho", "pas", "dri", "def", "phy"];

export const STAT_LABELS: Record<StatKey, string> = {
  pac: "PAC",
  sho: "SHO",
  pas: "PAS",
  dri: "DRI",
  def: "DEF",
  phy: "PHY",
};

/** Position-weighted average of the six face stats, rounded. */
export function calcOverall(stats: Stats, position: Position): number {
  const weights = POSITION_WEIGHTS[position];
  const total = STAT_KEYS.reduce(
    (sum, key) => sum + stats[key] * weights[key],
    0,
  );
  return Math.round(total);
}

export type CardTier = "bronze" | "silver" | "gold";

export function tierFor(overall: number): CardTier {
  if (overall >= 75) return "gold";
  if (overall >= 65) return "silver";
  return "bronze";
}
