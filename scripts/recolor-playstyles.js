#!/usr/bin/env node
// Makes the silver and bronze PlayStyle+ badges from the gold originals.
//
//   node scripts/recolor-playstyles.js
//
// Reads assets/playstyles/*.png (gold) and writes assets/playstyles/silver/
// and assets/playstyles/bronze/. Only the gold is recoloured: the white
// outline and white glyph stay as they are. Run it again after replacing a
// gold icon. Needs only Node (no packages).
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const DIR = path.join(__dirname, "..", "assets", "playstyles");

// Gold lightness is mapped onto each tier's own colour (hue, saturation,
// lightness). Tuned against the card gradients in src/theme.ts.
const TIERS = {
  silver: (h, s, l) => [216, 0.13, Math.min(0.96, l)],
  bronze: (h, s, l) => [27, 0.5, l * 0.72],
};

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r + m, g + m, b + m].map((v) => Math.round(v * 255));
}

/** 8-bit, non-interlaced PNG -> RGBA pixels. */
function decodePng(buf) {
  let p = 8, width, height, type;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const chunk = buf.toString("ascii", p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (chunk === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      type = data[9];
      if (data[8] !== 8 || data[12] !== 0) throw new Error("only 8-bit non-interlaced PNGs are supported");
    }
    if (chunk === "IDAT") idat.push(data);
    p += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[type];
  if (!channels) throw new Error("unsupported PNG colour type " + type);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rgba = new Uint8Array(width * height * 4);
  let prev = new Uint8Array(stride);
  const cur = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = row[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 255;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4, s = x * channels;
      if (channels >= 3) {
        rgba[o] = cur[s]; rgba[o + 1] = cur[s + 1]; rgba[o + 2] = cur[s + 2];
        rgba[o + 3] = channels === 4 ? cur[s + 3] : 255;
      } else {
        rgba[o] = rgba[o + 1] = rgba[o + 2] = cur[s];
        rgba[o + 3] = channels === 2 ? cur[s + 1] : 255;
      }
    }
    prev = cur.slice();
  }
  return { width, height, rgba };
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}
/** RGBA pixels -> PNG. */
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function recolor(rgba, tier) {
  const out = new Uint8Array(rgba);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0) continue;
    const [h, s, l] = rgbToHsl(out[i], out[i + 1], out[i + 2]);
    // 0 for neutral pixels (the white outline and glyph), 1 for clear gold;
    // the soft edge between them blends.
    const gold = h >= 15 && h <= 70 ? Math.min(1, s / 0.35) : 0;
    if (gold === 0) continue;
    const [r, g, b] = hslToRgb(...TIERS[tier](h, s, l));
    out[i] = Math.round(out[i] * (1 - gold) + r * gold);
    out[i + 1] = Math.round(out[i + 1] * (1 - gold) + g * gold);
    out[i + 2] = Math.round(out[i + 2] * (1 - gold) + b * gold);
  }
  return out;
}

const icons = fs.readdirSync(DIR).filter((f) => f.endsWith(".png"));
for (const tier of Object.keys(TIERS)) {
  fs.mkdirSync(path.join(DIR, tier), { recursive: true });
  for (const file of icons) {
    const { width, height, rgba } = decodePng(fs.readFileSync(path.join(DIR, file)));
    fs.writeFileSync(path.join(DIR, tier, file), encodePng(width, height, recolor(rgba, tier)));
  }
}
console.log(`Wrote ${icons.length} silver and ${icons.length} bronze badges.`);
