/**
 * Generates solid-colour placeholder PNGs for every PlayStyle icon so the
 * app bundles out of the box. Replace the files in assets/playstyles/ with
 * your own PNGs (same filenames) — no code changes needed.
 *
 * Usage: npm run icons:placeholders
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// name -> category (kept in sync with src/constants/playstyles.ts)
const PLAYSTYLES = {
  "Finesse Shot": "Scoring",
  "Power Shot": "Scoring",
  "Chip Shot": "Scoring",
  "Power Header": "Scoring",
  Trivela: "Scoring",
  "Incisive Pass": "Passing",
  "Pinged Pass": "Passing",
  "Long Ball Pass": "Passing",
  "Tiki Taka": "Passing",
  "Whipped Pass": "Passing",
  "First Touch": "Ball Control",
  Flair: "Ball Control",
  "Press Proven": "Ball Control",
  Rapid: "Ball Control",
  Technical: "Ball Control",
  Trickster: "Ball Control",
  Block: "Defending",
  Bruiser: "Defending",
  Intercept: "Defending",
  Jockey: "Defending",
  "Slide Tackle": "Defending",
  Anticipate: "Defending",
  Acrobatic: "Physical",
  Aerial: "Physical",
  "Quick Step": "Physical",
  Relentless: "Physical",
  "Long Throw": "Physical",
  "Far Throw": "Goalkeeper",
  Footwork: "Goalkeeper",
  "Cross Claimer": "Goalkeeper",
  "Rush Out": "Goalkeeper",
  "Far Reach": "Goalkeeper",
};

const CATEGORY_COLORS = {
  Scoring: [231, 76, 60],
  Passing: [52, 152, 219],
  "Ball Control": [155, 89, 182],
  Defending: [39, 174, 96],
  Physical: [230, 126, 34],
  Goalkeeper: [241, 196, 15],
};

const SIZE = 64;

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function makePng([r, g, b]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0); // width
  ihdr.writeUInt32BE(SIZE, 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  // raw scanlines: filter byte + RGBA pixels; rounded-square-ish alpha mask
  const rows = [];
  for (let y = 0; y < SIZE; y++) {
    const row = Buffer.alloc(1 + SIZE * 4);
    for (let x = 0; x < SIZE; x++) {
      // simple circle mask so placeholders look like round badges
      const dx = x - SIZE / 2 + 0.5;
      const dy = y - SIZE / 2 + 0.5;
      const inside = dx * dx + dy * dy <= (SIZE / 2 - 1) ** 2;
      const o = 1 + x * 4;
      row[o] = r;
      row[o + 1] = g;
      row[o + 2] = b;
      row[o + 3] = inside ? 255 : 0;
    }
    rows.push(row);
  }
  const idat = zlib.deflateSync(Buffer.concat(rows));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const fileNameFor = (name) => name.toLowerCase().replace(/\s+/g, "-") + ".png";

const outDir = path.join(__dirname, "..", "assets", "playstyles");
fs.mkdirSync(outDir, { recursive: true });

for (const [name, category] of Object.entries(PLAYSTYLES)) {
  const file = path.join(outDir, fileNameFor(name));
  if (fs.existsSync(file)) continue; // never clobber real icons
  fs.writeFileSync(file, makePng(CATEGORY_COLORS[category]));
  console.log("created", path.relative(process.cwd(), file));
}
console.log("Done. Replace these PNGs with your own icons (same filenames).");
