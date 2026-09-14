import { deflate } from "pako";

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = -1;
  for (let i = 0; i < bytes.length; i++)
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type: string, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(body.length + 12);
  const view = new DataView(out.buffer);
  view.setUint32(0, body.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(body, 8);
  view.setUint32(out.length - 4, crc32(out.subarray(4, out.length - 4)));
  return out;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** Cost heuristic from the PNG spec: prefer the filter with the least entropy. */
function score(row: Uint8Array): number {
  let sum = 0;
  for (let i = 1; i < row.length; i++) sum += row[i] < 128 ? row[i] : 256 - row[i];
  return sum;
}

/**
 * Encodes 8-bit RGBA pixels as a PNG. Written by hand because the image
 * pipeline only needs this one direction, and every off-the-shelf encoder
 * pulls in a Buffer polyfill.
 */
export function encodePng(
  rgba: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const bpp = 4;
  const stride = width * bpp;

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: truecolour with alpha
  // 10..12 stay zero: deflate, adaptive filtering, no interlace.

  const raw = new Uint8Array((stride + 1) * height);
  const candidates = [0, 1, 2, 3, 4].map(() => new Uint8Array(stride + 1));
  const zeros = new Uint8Array(stride);

  for (let y = 0; y < height; y++) {
    const line = rgba.subarray(y * stride, y * stride + stride);
    const prev = y > 0 ? rgba.subarray((y - 1) * stride, y * stride) : zeros;

    for (let f = 0; f < 5; f++) candidates[f][0] = f;
    for (let i = 0; i < stride; i++) {
      const x = line[i];
      const a = i >= bpp ? line[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      candidates[0][i + 1] = x;
      candidates[1][i + 1] = (x - a) & 0xff;
      candidates[2][i + 1] = (x - b) & 0xff;
      candidates[3][i + 1] = (x - ((a + b) >> 1)) & 0xff;
      candidates[4][i + 1] = (x - paeth(a, b, c)) & 0xff;
    }

    let best = 0;
    let bestScore = Infinity;
    for (let f = 0; f < 5; f++) {
      const s = score(candidates[f]);
      if (s < bestScore) {
        bestScore = s;
        best = f;
      }
    }
    raw.set(candidates[best], y * (stride + 1));
  }

  const idat = deflate(raw, { level: 6 });

  const parts = [
    Uint8Array.from(SIGNATURE),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const png = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    png.set(part, offset);
    offset += part.length;
  }
  return png;
}
