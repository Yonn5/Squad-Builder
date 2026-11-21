import type { Formation, FormationSlot } from "../constants/formations";

/**
 * Where the cards go on the lineup pitch, and how big they are. Kept apart
 * from the component so it can be checked for every formation and screen.
 */

/** The pitch's width-to-height ratio; tall enough for cards in four rows. */
export const PITCH_ASPECT = 0.62;
/** Cards are 1.3 times as tall as they are wide. */
export const CARD_RATIO = 1.3;
/** Room left between neighbouring cards, as a share of their size. */
const CARD_GAP = 0.94;
/** Bounds on a card's width, in points. */
const CARD_MIN = 40;
const CARD_MAX = 96;

/**
 * The widest a card can be in this formation without touching a neighbour
 * or running off the pitch. Two cards clear each other if they are a card's
 * width apart sideways or a card's height apart up and down, so the closest
 * pair decides.
 */
export function cardWidthFor(formation: Formation, pitchWidth: number): number {
  const w = pitchWidth;
  const h = pitchWidth / PITCH_ASPECT;
  let width = CARD_MAX;
  const slots = formation.slots;
  for (let i = 0; i < slots.length; i++) {
    const a = slots[i];
    // stay on the pitch sideways
    width = Math.min(
      width,
      2 * ((a.x / 100) * w - 4),
      2 * ((1 - a.x / 100) * w - 4),
    );
    for (let j = i + 1; j < slots.length; j++) {
      const b = slots[j];
      const dx = (Math.abs(a.x - b.x) / 100) * w;
      const dy = (Math.abs(a.y - b.y) / 100) * h;
      width = Math.min(width, Math.max(dx, dy / CARD_RATIO) * CARD_GAP);
    }
  }
  // Cards near the goal lines are nudged inwards to stay on the pitch
  // (cardTopLeft), which can push a big keeper card into the defence: shrink
  // until the cards as actually placed clear each other.
  let size = Math.max(CARD_MIN, Math.floor(width));
  while (size > CARD_MIN && placedOverlap(formation, pitchWidth, size)) size--;
  return size;
}

function placedOverlap(
  formation: Formation,
  pitchWidth: number,
  cardWidth: number,
): boolean {
  const boxes = formation.slots.map((slot) =>
    cardTopLeft(slot, pitchWidth, cardWidth),
  );
  const h = cardWidth * CARD_RATIO;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (Math.abs(a.left - b.left) < cardWidth && Math.abs(a.top - b.top) < h)
        return true;
    }
  }
  return false;
}

/**
 * A card's top-left corner on the pitch, centred on its slot but kept
 * inside the pitch: a keeper's card would otherwise hang off the bottom.
 */
export function cardTopLeft(
  slot: FormationSlot,
  pitchWidth: number,
  cardWidth: number,
): { left: number; top: number } {
  const pitchHeight = pitchWidth / PITCH_ASPECT;
  const cardHeight = cardWidth * CARD_RATIO;
  return {
    left: (slot.x / 100) * pitchWidth - cardWidth / 2,
    top: Math.min(
      Math.max((slot.y / 100) * pitchHeight - cardHeight / 2, 4),
      pitchHeight - cardHeight - 4,
    ),
  };
}
