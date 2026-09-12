import type { Stats } from "../types";

export const POSITIONS = [
  "GK",
  "RB",
  "CB",
  "LB",
  "CDM",
  "CM",
  "CAM",
  "RM",
  "LM",
  "RW",
  "LW",
  "CF",
  "ST",
] as const;

export type Position = (typeof POSITIONS)[number];

export const POSITION_GROUPS = [
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Forward",
] as const;

export type PositionGroup = (typeof POSITION_GROUPS)[number];

/**
 * Positions are picked in two steps: group first, then the specific role.
 * Goalkeeper has no sub-choice — picking it selects GK outright, and the
 * card switches to goalkeeper stats.
 */
export const POSITIONS_BY_GROUP: Record<PositionGroup, Position[]> = {
  Goalkeeper: ["GK"],
  Defender: ["LB", "CB", "RB"],
  Midfielder: ["CDM", "CM", "CAM", "LM", "RM"],
  Forward: ["LW", "RW", "CF", "ST"],
};

export const POSITION_NAMES: Record<Position, string> = {
  GK: "Goalkeeper",
  RB: "Right Back",
  CB: "Centre Back",
  LB: "Left Back",
  CDM: "Defensive Midfielder",
  CM: "Central Midfielder",
  CAM: "Attacking Midfielder",
  RM: "Right Midfielder",
  LM: "Left Midfielder",
  RW: "Right Winger",
  LW: "Left Winger",
  CF: "Centre Forward",
  ST: "Striker",
};

export function groupOf(position: Position): PositionGroup {
  for (const group of POSITION_GROUPS) {
    if (POSITIONS_BY_GROUP[group].includes(position)) return group;
  }
  return "Forward";
}

/**
 * How much each face stat contributes to the overall rating for a given
 * outfield position. Each row sums to 1. Goalkeepers use GK_WEIGHTS in
 * logic/overall.ts instead.
 */
export const POSITION_WEIGHTS: Record<Position, Stats> = {
  GK:  { pac: 0.05, sho: 0.05, pas: 0.15, dri: 0.1, def: 0.35, phy: 0.3 },
  CB:  { pac: 0.1, sho: 0.05, pas: 0.1, dri: 0.1, def: 0.4, phy: 0.25 },
  RB:  { pac: 0.2, sho: 0.05, pas: 0.15, dri: 0.15, def: 0.3, phy: 0.15 },
  LB:  { pac: 0.2, sho: 0.05, pas: 0.15, dri: 0.15, def: 0.3, phy: 0.15 },
  CDM: { pac: 0.1, sho: 0.1, pas: 0.2, dri: 0.15, def: 0.3, phy: 0.15 },
  CM:  { pac: 0.1, sho: 0.15, pas: 0.3, dri: 0.2, def: 0.15, phy: 0.1 },
  CAM: { pac: 0.1, sho: 0.25, pas: 0.3, dri: 0.25, def: 0.03, phy: 0.07 },
  RM:  { pac: 0.25, sho: 0.15, pas: 0.25, dri: 0.25, def: 0.05, phy: 0.05 },
  LM:  { pac: 0.25, sho: 0.15, pas: 0.25, dri: 0.25, def: 0.05, phy: 0.05 },
  RW:  { pac: 0.25, sho: 0.25, pas: 0.15, dri: 0.3, def: 0.02, phy: 0.03 },
  LW:  { pac: 0.25, sho: 0.25, pas: 0.15, dri: 0.3, def: 0.02, phy: 0.03 },
  CF:  { pac: 0.15, sho: 0.32, pas: 0.15, dri: 0.25, def: 0.02, phy: 0.11 },
  ST:  { pac: 0.2, sho: 0.4, pas: 0.05, dri: 0.2, def: 0, phy: 0.15 },
};

/**
 * Positions considered "adjacent" for chemistry: playing there earns +1
 * instead of the +3 for an exact match.
 */
export const ADJACENT_POSITIONS: Record<Position, Position[]> = {
  GK:  [],
  CB:  ["RB", "LB", "CDM"],
  RB:  ["CB", "RM"],
  LB:  ["CB", "LM"],
  CDM: ["CB", "CM"],
  CM:  ["CDM", "CAM"],
  CAM: ["CM", "CF", "ST"],
  RM:  ["RB", "RW"],
  LM:  ["LB", "LW"],
  RW:  ["RM", "ST", "CF"],
  LW:  ["LM", "ST", "CF"],
  CF:  ["ST", "CAM", "RW", "LW"],
  ST:  ["CF", "CAM", "RW", "LW"],
};
