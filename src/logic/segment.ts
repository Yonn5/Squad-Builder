export type Bitmap = {
  /** 8-bit RGBA, row-major, non-premultiplied. */
  data: Uint8Array;
  width: number;
  height: number;
};

export type Cutout = Bitmap & {
  /** Share of the original frame kept as subject, 0..1. */
  coverage: number;
  /**
   * Share of what was kept that belongs to its single largest piece, 0..1.
   * A player comes out as one shape; a handful of scattered scraps means the
   * fill could not tell player from backdrop.
   */
  dominance: number;
};

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

/**
 * Separates the subject from its background and returns it cropped, with
 * everything else transparent.
 *
 * The background is found by flood-filling inwards from the frame's edges:
 * a neighbouring pixel joins the background when it is close in colour both
 * to the pixel it spread from (which lets smooth walls and skies through)
 * and to the edge pixel the fill started at (which stops the fill drifting
 * across a gradient and into the player). It is a colour-based segmentation,
 * not a model, so it does well on plain backdrops and less well on busy ones.
 */
export function cutOutSubject(src: Bitmap): Cutout {
  const { width: w, height: h, data } = src;
  const n = w * h;

  // The fill reads a de-speckled copy: JPEG ringing along the player's
  // outline otherwise survives as thin streaks of "not background", and
  // sensor grain makes the fill stall. A median is used rather than a blur
  // because it removes those specks while leaving the step from backdrop to
  // player as sharp as it was — that step is the whole signal here. Colours
  // in the result still come from the original.
  const cleaned = medianFilter(data, w, h);

  const background = floodBackground(cleaned, w, h);
  const mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) mask[i] = background[i] ? 0 : 1;

  openMask(mask, w, h);
  const dominance = dropStrayIslands(mask, w, h);
  const kept = erode(mask, w, h);
  const alpha = featherEdges(kept, w, h);

  let covered = 0;
  for (let i = 0; i < n; i++) if (alpha[i] > 8) covered++;

  const rgba = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    rgba[i * 4] = data[i * 4];
    rgba[i * 4 + 1] = data[i * 4 + 1];
    rgba[i * 4 + 2] = data[i * 4 + 2];
    rgba[i * 4 + 3] = alpha[i];
  }
  deFringe(rgba, alpha, w, h);

  const cropped = cropToSubject({ data: rgba, width: w, height: h });
  return { ...cropped, coverage: covered / n, dominance };
}

/** Coarse colour bucket, 8 levels per channel. */
function bucketOf(data: Uint8Array, p: number): number {
  return (
    ((data[p * 4] >> 5) << 6) |
    ((data[p * 4 + 1] >> 5) << 3) |
    (data[p * 4 + 2] >> 5)
  );
}

/**
 * Chooses which edge pixels the background fill may start from.
 *
 * Two rules, both aimed at the same failure: seeding the fill with the
 * player's own colour and erasing him.
 *
 * 1. Only edges a player rarely touches are considered — the top of the
 *    frame, the upper part of the sides, and the bottom corners. A torso
 *    running off the bottom edge, or an arm out to one side, is skipped.
 * 2. Of those, only pixels whose colour is *common along the edge* are kept.
 *    The real backdrop dominates the border; whatever the player occupies is
 *    a minority of it.
 */
function pickSeeds(data: Uint8Array, w: number, h: number): number[] {
  const sideStop = Math.floor(h * 0.3);
  const bottomInset = Math.floor(w * 0.14);
  const border: number[] = [];
  for (let x = 0; x < w; x++) {
    border.push(x);
    if (x < bottomInset || x >= w - bottomInset) border.push((h - 1) * w + x);
  }
  for (let y = 1; y < sideStop; y++) {
    border.push(y * w);
    border.push(y * w + w - 1);
  }

  const counts = new Map<number, number>();
  for (const p of border) {
    const bucket = bucketOf(data, p);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }

  const ranked = [...counts].sort((a, b) => b[1] - a[1]);
  const minShare = border.length * 0.02;
  const keep = new Set<number>();
  let covered = 0;
  for (const [bucket, count] of ranked) {
    if (keep.size > 0 && (count < minShare || covered >= border.length * 0.9))
      break;
    keep.add(bucket);
    covered += count;
  }

  const seeds = border.filter((p) => keep.has(bucketOf(data, p)));
  // A border with no dominant colour at all tells us nothing; fall back to
  // using all of it rather than starting from a handful of pixels.
  return seeds.length >= border.length * 0.2 ? seeds : border;
}

/** Typical colour step between neighbouring pixels along the top edge. */
function edgeGrain(data: Uint8Array, w: number): number {
  if (w < 2) return 0;
  let total = 0;
  for (let x = 1; x < w; x++) {
    const a = x * 4;
    const b = (x - 1) * 4;
    const dr = data[a] - data[b];
    const dg = data[a + 1] - data[b + 1];
    const db = data[a + 2] - data[b + 2];
    total += Math.sqrt(dr * dr + dg * dg + db * db);
  }
  return total / (w - 1);
}

/** 3x3 median of the colour channels; alpha is left alone. */
function medianFilter(data: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(data.length);
  const p = new Uint8Array(9);
  for (let y = 0; y < h; y++) {
    const y0 = (y > 0 ? y - 1 : 0) * w;
    const y1 = y * w;
    const y2 = (y < h - 1 ? y + 1 : h - 1) * w;
    for (let x = 0; x < w; x++) {
      const x0 = x > 0 ? x - 1 : 0;
      const x2 = x < w - 1 ? x + 1 : w - 1;
      const i = (y1 + x) * 4;
      for (let c = 0; c < 3; c++) {
        p[0] = data[(y0 + x0) * 4 + c];
        p[1] = data[(y0 + x) * 4 + c];
        p[2] = data[(y0 + x2) * 4 + c];
        p[3] = data[(y1 + x0) * 4 + c];
        p[4] = data[i + c];
        p[5] = data[(y1 + x2) * 4 + c];
        p[6] = data[(y2 + x0) * 4 + c];
        p[7] = data[(y2 + x) * 4 + c];
        p[8] = data[(y2 + x2) * 4 + c];
        out[i + c] = medianOfNine(p);
      }
      out[i + 3] = data[i + 3];
    }
  }
  return out;
}

/** Smith's 19-step sorting network; only p[4] ends up in the right place. */
function medianOfNine(p: Uint8Array): number {
  const swap = (a: number, b: number) => {
    if (p[a] > p[b]) {
      const t = p[a];
      p[a] = p[b];
      p[b] = t;
    }
  };
  swap(1, 2); swap(4, 5); swap(7, 8);
  swap(0, 1); swap(3, 4); swap(6, 7);
  swap(1, 2); swap(4, 5); swap(7, 8);
  swap(0, 3); swap(5, 8); swap(4, 7);
  swap(3, 6); swap(1, 4); swap(2, 5);
  swap(4, 7); swap(2, 4); swap(4, 6); swap(2, 4);
  return p[4];
}

/**
 * Morphological opening: erode then dilate. Thin filaments left along the
 * player's outline disappear; everything with substance comes back.
 */
function openMask(mask: Uint8Array, w: number, h: number): void {
  const thinned = erode(mask, w, h);
  const n = w * h;
  mask.fill(0);
  for (let i = 0; i < n; i++) {
    if (!thinned[i]) continue;
    const x = i % w;
    mask[i] = 1;
    if (x > 0) mask[i - 1] = 1;
    if (x < w - 1) mask[i + 1] = 1;
    if (i >= w) mask[i - w] = 1;
    if (i + w < n) mask[i + w] = 1;
  }
}

/** Marks every pixel the fill reaches from the frame's edges. */
function floodBackground(data: Uint8Array, w: number, h: number): Uint8Array {
  const n = w * h;
  const background = new Uint8Array(n);
  const originR = new Uint8Array(n);
  const originG = new Uint8Array(n);
  const originB = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;

  const seeds = pickSeeds(data, w, h);

  let sum = 0;
  let sumSq = 0;
  for (const p of seeds) {
    for (let c = 0; c < 3; c++) {
      const v = data[p * 4 + c];
      sum += v;
      sumSq += v * v;
    }
  }
  const count = seeds.length * 3;
  const mean = sum / count;
  const spread = Math.sqrt(Math.max(0, sumSq / count - mean * mean));
  // A busy backdrop needs a looser fill to cover at all; a flat one needs a
  // tight fill so the player's shirt never gets swallowed.
  const grain = edgeGrain(data, w);
  const localTol = clamp(20 + spread * 0.35 + grain * 1.2, 22, 60) ** 2;
  // Room for a backdrop to shade from one side of the frame to the other
  // (vignetting, a wall lit from one side) without ever reaching as far as
  // the colour of a person standing in front of it.
  const originTol = clamp(36 + spread * 0.9, 46, 96) ** 2;

  for (const p of seeds) {
    if (background[p]) continue;
    background[p] = 1;
    originR[p] = data[p * 4];
    originG[p] = data[p * 4 + 1];
    originB[p] = data[p * 4 + 2];
    queue[tail++] = p;
  }

  while (head < tail) {
    const p = queue[head++];
    const px = p % w;
    const pr = data[p * 4];
    const pg = data[p * 4 + 1];
    const pb = data[p * 4 + 2];
    const or = originR[p];
    const og = originG[p];
    const ob = originB[p];

    for (let k = 0; k < 4; k++) {
      let q: number;
      if (k === 0) {
        if (px === 0) continue;
        q = p - 1;
      } else if (k === 1) {
        if (px === w - 1) continue;
        q = p + 1;
      } else if (k === 2) {
        q = p - w;
        if (q < 0) continue;
      } else {
        q = p + w;
        if (q >= n) continue;
      }
      if (background[q]) continue;

      const qr = data[q * 4];
      const qg = data[q * 4 + 1];
      const qb = data[q * 4 + 2];

      let dr = qr - pr;
      let dg = qg - pg;
      let db = qb - pb;
      if (dr * dr + dg * dg + db * db > localTol) continue;

      dr = qr - or;
      dg = qg - og;
      db = qb - ob;
      if (dr * dr + dg * dg + db * db > originTol) continue;

      background[q] = 1;
      originR[q] = or;
      originG[q] = og;
      originB[q] = ob;
      queue[tail++] = q;
    }
  }

  return background;
}

/**
 * Deletes specks the fill could not reach, and reports what share of what
 * remains is its largest single piece.
 */
function dropStrayIslands(mask: Uint8Array, w: number, h: number): number {
  const n = w * h;
  const label = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  const sizes: number[] = [];

  for (let start = 0; start < n; start++) {
    if (!mask[start] || label[start] >= 0) continue;
    const id = sizes.length;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    label[start] = id;
    while (head < tail) {
      const p = queue[head++];
      const px = p % w;
      if (px > 0 && mask[p - 1] && label[p - 1] < 0) {
        label[p - 1] = id;
        queue[tail++] = p - 1;
      }
      if (px < w - 1 && mask[p + 1] && label[p + 1] < 0) {
        label[p + 1] = id;
        queue[tail++] = p + 1;
      }
      if (p >= w && mask[p - w] && label[p - w] < 0) {
        label[p - w] = id;
        queue[tail++] = p - w;
      }
      if (p + w < n && mask[p + w] && label[p + w] < 0) {
        label[p + w] = id;
        queue[tail++] = p + w;
      }
    }
    sizes.push(tail);
  }

  if (sizes.length === 0) return 0;
  const largest = Math.max(...sizes);
  const floor = Math.max(largest * 0.08, n * 0.0015);
  let kept = 0;
  for (let i = 0; i < n; i++) {
    if (!mask[i]) continue;
    if (sizes[label[i]] < floor) mask[i] = 0;
    else kept++;
  }
  return kept > 0 ? largest / kept : 0;
}

/** Trims one pixel off the subject, where the background colour bleeds in. */
function erode(mask: Uint8Array, w: number, h: number): Uint8Array {
  const n = w * h;
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!mask[i]) continue;
    const x = i % w;
    // Pixels against the frame's own edge keep their neighbours implicitly,
    // so a subject running off the bottom is not shaved.
    if (x > 0 && !mask[i - 1]) continue;
    if (x < w - 1 && !mask[i + 1]) continue;
    if (i >= w && !mask[i - w]) continue;
    if (i + w < n && !mask[i + w]) continue;
    out[i] = 1;
  }
  return out;
}

/** Turns the hard mask into a soft alpha channel with a ~2px transition. */
function featherEdges(mask: Uint8Array, w: number, h: number): Uint8Array {
  const n = w * h;
  const alpha = new Uint8Array(n);
  for (let i = 0; i < n; i++) alpha[i] = mask[i] ? 255 : 0;

  const tmp = new Uint8Array(n);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const l = alpha[row + (x > 0 ? x - 1 : 0)];
        const c = alpha[row + x];
        const r = alpha[row + (x < w - 1 ? x + 1 : w - 1)];
        tmp[row + x] = (l + 2 * c + r) >> 2;
      }
    }
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const u = tmp[(y > 0 ? y - 1 : 0) * w + x];
        const c = tmp[y * w + x];
        const d = tmp[(y < h - 1 ? y + 1 : h - 1) * w + x];
        alpha[y * w + x] = (u + 2 * c + d) >> 2;
      }
    }
  }

  // Pull the ramp back towards the subject so the cut-out has no pale halo.
  for (let i = 0; i < n; i++) {
    const v = alpha[i];
    alpha[i] = v <= 40 ? 0 : v >= 210 ? 255 : Math.round(((v - 40) * 255) / 170);
  }
  return alpha;
}

/**
 * Replaces the colour of part-transparent edge pixels with the nearest solid
 * subject colour, so no ring of old background survives in the matte.
 */
function deFringe(
  rgba: Uint8Array,
  alpha: Uint8Array,
  w: number,
  h: number,
): void {
  const n = w * h;
  const edges: number[] = [];
  for (let i = 0; i < n; i++) if (alpha[i] > 0 && alpha[i] < 250) edges.push(i);

  for (const i of edges) {
    const x = i % w;
    const y = (i / w) | 0;
    let r = 0;
    let g = 0;
    let b = 0;
    let weight = 0;
    for (let dy = -2; dy <= 2; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= h) continue;
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= w) continue;
        const j = ny * w + nx;
        if (alpha[j] < 250) continue;
        const wgt = 1 / (1 + dx * dx + dy * dy);
        r += rgba[j * 4] * wgt;
        g += rgba[j * 4 + 1] * wgt;
        b += rgba[j * 4 + 2] * wgt;
        weight += wgt;
      }
    }
    if (weight === 0) continue;
    rgba[i * 4] = Math.round(r / weight);
    rgba[i * 4 + 1] = Math.round(g / weight);
    rgba[i * 4 + 2] = Math.round(b / weight);
  }
}

/** Crops away the transparent margin so the subject fills the card slot. */
export function cropToSubject(src: Bitmap, pad = 2): Bitmap {
  const { data, width: w, height: h } = src;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] <= 8) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return src; // nothing survived; let the caller decide

  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);

  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  if (cw === w && ch === h) return src;

  const out = new Uint8Array(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    const from = ((minY + y) * w + minX) * 4;
    out.set(data.subarray(from, from + cw * 4), y * cw * 4);
  }
  return { data: out, width: cw, height: ch };
}
