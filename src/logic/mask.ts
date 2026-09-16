import type { Bitmap } from "./segment";

export type Point = { x: number; y: number };

/** One drag of a finger across the photo, in image pixels. */
export type Stroke = {
  points: Point[];
  /** Brush radius in image pixels. */
  radius: number;
  /** True rubs the photo away, false paints it back. */
  erase: boolean;
};

export type Rect = { x: number; y: number; width: number; height: number };

/** How much of the brush edge fades, in pixels. */
const FEATHER = 2;

/**
 * Paints strokes into a keep-mask (255 keeps the pixel, 0 removes it).
 *
 * Strokes are replayed from scratch rather than accumulated, so undo is just
 * dropping the last one and calling this again.
 */
export function paintStrokes(
  mask: Uint8Array,
  width: number,
  height: number,
  strokes: Stroke[],
  base?: Uint8Array,
): void {
  if (base) mask.set(base);
  else mask.fill(255);

  for (const stroke of strokes) {
    const { points, radius, erase } = stroke;
    if (points.length === 0) continue;
    // Stamping only at the sampled points leaves gaps when a finger moves
    // fast, so each gap is walked at a fraction of the brush width.
    const step = Math.max(1, radius / 3);
    let previous = points[0];
    stamp(mask, width, height, previous.x, previous.y, radius, erase);
    for (let i = 1; i < points.length; i++) {
      const next = points[i];
      const dx = next.x - previous.x;
      const dy = next.y - previous.y;
      const length = Math.hypot(dx, dy);
      const steps = Math.ceil(length / step);
      for (let s = 1; s <= steps; s++) {
        stamp(
          mask,
          width,
          height,
          previous.x + (dx * s) / steps,
          previous.y + (dy * s) / steps,
          radius,
          erase,
        );
      }
      previous = next;
    }
  }
}

function stamp(
  mask: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  erase: boolean,
): void {
  const solid = Math.max(0, radius - FEATHER);
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(width - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(height - 1, Math.ceil(cy + radius));

  for (let y = minY; y <= maxY; y++) {
    const dy = y - cy;
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > radius) continue;
      const strength =
        distance <= solid
          ? 255
          : Math.round((255 * (radius - distance)) / (radius - solid));
      const i = y * width + x;
      if (erase) {
        const kept = 255 - strength;
        if (kept < mask[i]) mask[i] = kept;
      } else if (strength > mask[i]) {
        mask[i] = strength;
      }
    }
  }
}

/** Copies the photo with the mask as its alpha channel. */
export function applyMask(source: Bitmap, mask: Uint8Array): Bitmap {
  const { data, width, height } = source;
  const out = new Uint8Array(width * height * 4);
  out.set(data);
  for (let i = 0; i < width * height; i++) {
    out[i * 4 + 3] = Math.min(data[i * 4 + 3], mask[i]);
  }
  return { data: out, width, height };
}

/** Cuts a rectangle out of a bitmap, clamped to its bounds. */
export function cropBitmap(source: Bitmap, rect: Rect): Bitmap {
  const { data, width, height } = source;
  const x = Math.max(0, Math.min(width - 1, Math.round(rect.x)));
  const y = Math.max(0, Math.min(height - 1, Math.round(rect.y)));
  const w = Math.max(1, Math.min(width - x, Math.round(rect.width)));
  const h = Math.max(1, Math.min(height - y, Math.round(rect.height)));
  if (x === 0 && y === 0 && w === width && h === height) return source;

  const out = new Uint8Array(w * h * 4);
  for (let row = 0; row < h; row++) {
    const from = ((y + row) * width + x) * 4;
    out.set(data.subarray(from, from + w * 4), row * w * 4);
  }
  return { data: out, width: w, height: h };
}

/** Nearest-neighbour rescale, used for the editor's quick preview. */
export function scaleBitmap(source: Bitmap, maxSide: number): Bitmap {
  const { data, width, height } = source;
  const longest = Math.max(width, height);
  if (longest <= maxSide) return source;

  const w = Math.max(1, Math.round((width * maxSide) / longest));
  const h = Math.max(1, Math.round((height * maxSide) / longest));
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(height - 1, ((y * height) / h) | 0);
    for (let x = 0; x < w; x++) {
      const sx = Math.min(width - 1, ((x * width) / w) | 0);
      const from = (sy * width + sx) * 4;
      const to = (y * w + x) * 4;
      out[to] = data[from];
      out[to + 1] = data[from + 1];
      out[to + 2] = data[from + 2];
      out[to + 3] = data[from + 3];
    }
  }
  return { data: out, width: w, height: h };
}

/**
 * Bilinear rescale of a keep-mask. Used to carry the mask a player painted
 * at the editor's working size up to the size the photo is saved at, so what
 * they saw is what gets stored.
 */
export function scaleMask(
  mask: Uint8Array,
  width: number,
  height: number,
  toWidth: number,
  toHeight: number,
): Uint8Array {
  if (width === toWidth && height === toHeight) return mask;
  const out = new Uint8Array(toWidth * toHeight);
  const ratioX = width / toWidth;
  const ratioY = height / toHeight;

  for (let y = 0; y < toHeight; y++) {
    const fy = Math.min(height - 1, (y + 0.5) * ratioY - 0.5);
    const y0 = Math.max(0, Math.floor(fy));
    const y1 = Math.min(height - 1, y0 + 1);
    const wy = fy - y0;

    for (let x = 0; x < toWidth; x++) {
      const fx = Math.min(width - 1, (x + 0.5) * ratioX - 0.5);
      const x0 = Math.max(0, Math.floor(fx));
      const x1 = Math.min(width - 1, x0 + 1);
      const wx = fx - x0;

      const top = mask[y0 * width + x0] * (1 - wx) + mask[y0 * width + x1] * wx;
      const bottom =
        mask[y1 * width + x0] * (1 - wx) + mask[y1 * width + x1] * wx;
      out[y * toWidth + x] = Math.round(top * (1 - wy) + bottom * wy);
    }
  }
  return out;
}

/**
 * Whether enough of the photo is see-through to call it a cut-out.
 *
 * A card lays a cut-out out differently from a photo that still has its
 * background: only a cut-out can run large and pass behind the rating,
 * because its corners are empty. The threshold keeps a few stray
 * anti-aliased pixels along an edge from counting.
 */
export function isCutOut(bitmap: Bitmap): boolean {
  const pixels = bitmap.width * bitmap.height;
  let clear = 0;
  for (let i = 0; i < pixels; i++) {
    if (bitmap.data[i * 4 + 3] < 128) clear++;
  }
  return clear > pixels * 0.02;
}
