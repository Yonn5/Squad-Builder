import type { Position } from "./positions";

export type FormationSlot = {
  position: Position;
  /** Percentage across the pitch, 0 = left touchline, 100 = right. */
  x: number;
  /** Percentage down the pitch, 0 = opponent's goal, 100 = own goal. */
  y: number;
};

export type Formation = {
  key: string;
  label: string;
  size: 6 | 10;
  slots: FormationSlot[];
};

export const FORMATIONS: Formation[] = [
  // ---------- 6v6 (GK + 5) ----------
  {
    key: "6v6-2-2-1",
    label: "2-2-1",
    size: 6,
    slots: [
      { position: "GK", x: 50, y: 90 },
      { position: "CB", x: 32, y: 70 },
      { position: "CB", x: 68, y: 70 },
      { position: "CM", x: 32, y: 46 },
      { position: "CM", x: 68, y: 46 },
      { position: "ST", x: 50, y: 20 },
    ],
  },
  {
    key: "6v6-2-1-2",
    label: "2-1-2",
    size: 6,
    slots: [
      { position: "GK", x: 50, y: 90 },
      { position: "CB", x: 32, y: 70 },
      { position: "CB", x: 68, y: 70 },
      { position: "CM", x: 50, y: 48 },
      { position: "ST", x: 32, y: 22 },
      { position: "ST", x: 68, y: 22 },
    ],
  },
  {
    key: "6v6-3-1-1",
    label: "3-1-1",
    size: 6,
    slots: [
      { position: "GK", x: 50, y: 90 },
      { position: "LB", x: 22, y: 70 },
      { position: "CB", x: 50, y: 72 },
      { position: "RB", x: 78, y: 70 },
      { position: "CM", x: 50, y: 46 },
      { position: "ST", x: 50, y: 20 },
    ],
  },
  {
    key: "6v6-1-2-2",
    label: "1-2-2",
    size: 6,
    slots: [
      { position: "GK", x: 50, y: 90 },
      { position: "CB", x: 50, y: 72 },
      { position: "CM", x: 32, y: 48 },
      { position: "CM", x: 68, y: 48 },
      { position: "ST", x: 32, y: 22 },
      { position: "ST", x: 68, y: 22 },
    ],
  },
  // ---------- 10v10 (GK + 9) ----------
  {
    key: "10v10-4-3-2",
    label: "4-3-2",
    size: 10,
    slots: [
      { position: "GK", x: 50, y: 92 },
      { position: "LB", x: 15, y: 72 },
      { position: "CB", x: 38, y: 75 },
      { position: "CB", x: 62, y: 75 },
      { position: "RB", x: 85, y: 72 },
      { position: "CM", x: 26, y: 48 },
      { position: "CM", x: 50, y: 50 },
      { position: "CM", x: 74, y: 48 },
      { position: "ST", x: 36, y: 22 },
      { position: "ST", x: 64, y: 22 },
    ],
  },
  {
    key: "10v10-4-2-3",
    label: "4-2-3",
    size: 10,
    slots: [
      { position: "GK", x: 50, y: 92 },
      { position: "LB", x: 15, y: 72 },
      { position: "CB", x: 38, y: 75 },
      { position: "CB", x: 62, y: 75 },
      { position: "RB", x: 85, y: 72 },
      { position: "CDM", x: 36, y: 52 },
      { position: "CDM", x: 64, y: 52 },
      { position: "LW", x: 22, y: 26 },
      { position: "ST", x: 50, y: 20 },
      { position: "RW", x: 78, y: 26 },
    ],
  },
  {
    key: "10v10-3-4-2",
    label: "3-4-2",
    size: 10,
    slots: [
      { position: "GK", x: 50, y: 92 },
      { position: "CB", x: 26, y: 74 },
      { position: "CB", x: 50, y: 76 },
      { position: "CB", x: 74, y: 74 },
      { position: "LM", x: 12, y: 46 },
      { position: "CM", x: 38, y: 50 },
      { position: "CM", x: 62, y: 50 },
      { position: "RM", x: 88, y: 46 },
      { position: "ST", x: 36, y: 21 },
      { position: "ST", x: 64, y: 21 },
    ],
  },
  {
    key: "10v10-3-3-3",
    label: "3-3-3",
    size: 10,
    slots: [
      { position: "GK", x: 50, y: 92 },
      { position: "CB", x: 26, y: 74 },
      { position: "CB", x: 50, y: 76 },
      { position: "CB", x: 74, y: 74 },
      { position: "CM", x: 26, y: 48 },
      { position: "CM", x: 50, y: 50 },
      { position: "CM", x: 74, y: 48 },
      { position: "LW", x: 24, y: 24 },
      { position: "ST", x: 50, y: 19 },
      { position: "RW", x: 76, y: 24 },
    ],
  },
  {
    key: "10v10-4-4-1",
    label: "4-4-1",
    size: 10,
    slots: [
      { position: "GK", x: 50, y: 92 },
      { position: "LB", x: 15, y: 72 },
      { position: "CB", x: 38, y: 75 },
      { position: "CB", x: 62, y: 75 },
      { position: "RB", x: 85, y: 72 },
      { position: "LM", x: 15, y: 46 },
      { position: "CM", x: 38, y: 50 },
      { position: "CM", x: 62, y: 50 },
      { position: "RM", x: 85, y: 46 },
      { position: "ST", x: 50, y: 20 },
    ],
  },
];

export function formationsForSize(size: 6 | 10): Formation[] {
  return FORMATIONS.filter((f) => f.size === size);
}

export function getFormation(key: string): Formation | undefined {
  return FORMATIONS.find((f) => f.key === key);
}
