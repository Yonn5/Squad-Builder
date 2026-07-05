import { ADJACENT_POSITIONS, type Position } from "../constants/positions";
import { playstyleCategory } from "../constants/playstyles";
import type { LineupSlot, Profile } from "../types";

/**
 * Chemistry rules:
 *  - Position match: +3 playing in your preferred position, +1 in an
 *    adjacent position, 0 anywhere else.
 *  - PlayStyle link: +1 if you share a playstyle category with at least
 *    one other player in the lineup.
 */
export function positionChemistry(slot: Position, preferred: Position): number {
  if (slot === preferred) return 3;
  if (ADJACENT_POSITIONS[preferred].includes(slot)) return 1;
  return 0;
}

export function hasPlaystyleLink(player: Profile, others: Profile[]): boolean {
  const myCategories = new Set(
    player.playstyles.map(playstyleCategory).filter(Boolean),
  );
  if (myCategories.size === 0) return false;
  return others.some(
    (o) =>
      o.id !== player.id &&
      o.playstyles.some((name) => myCategories.has(playstyleCategory(name))),
  );
}

export type SlotChemistry = {
  slotId: string;
  points: number;
  positionPoints: number;
  linkBonus: boolean;
};

export type LineupChemistry = {
  total: number;
  max: number;
  bySlot: Record<string, SlotChemistry>;
};

export function calcLineupChemistry(
  slots: LineupSlot[],
  profiles: Record<string, Profile>,
): LineupChemistry {
  const filled = slots.filter(
    (s): s is LineupSlot & { player_id: string } =>
      s.player_id !== null && !!profiles[s.player_id!],
  );
  const players = filled.map((s) => profiles[s.player_id]);

  const bySlot: Record<string, SlotChemistry> = {};
  let total = 0;
  for (const slot of filled) {
    const player = profiles[slot.player_id];
    const positionPoints = positionChemistry(slot.position, player.position);
    const linkBonus = hasPlaystyleLink(player, players);
    const points = positionPoints + (linkBonus ? 1 : 0);
    bySlot[slot.id] = { slotId: slot.id, points, positionPoints, linkBonus };
    total += points;
  }
  // Best case: every filled slot is an exact position match with a link.
  return { total, max: filled.length * 4, bySlot };
}
