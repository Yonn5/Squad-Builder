const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const LOOKUP = new Uint8Array(128);
for (let i = 0; i < ALPHABET.length; i++) LOOKUP[ALPHABET.charCodeAt(i)] = i;

/**
 * Base64 <-> bytes without relying on `atob`/`btoa` or `Buffer`, neither of
 * which is guaranteed to exist in Hermes.
 */
export function base64ToBytes(input: string): Uint8Array {
  // Tolerate a data URI prefix and any whitespace the source added.
  const comma = input.indexOf(",");
  const body = (comma >= 0 && input.slice(0, comma).includes("base64")
    ? input.slice(comma + 1)
    : input
  ).replace(/[^A-Za-z0-9+/=]/g, "");

  let len = body.length;
  while (len > 0 && body.charCodeAt(len - 1) === 61 /* = */) len--;

  const out = new Uint8Array((len * 3) >> 2);
  let o = 0;
  let bits = 0;
  let held = 0;
  for (let i = 0; i < len; i++) {
    held = (held << 6) | LOOKUP[body.charCodeAt(i)];
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (held >> bits) & 0xff;
    }
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  let chunk = "";
  const n = bytes.length;
  for (let i = 0; i < n; i += 3) {
    const a = bytes[i];
    const b = i + 1 < n ? bytes[i + 1] : 0;
    const c = i + 2 < n ? bytes[i + 2] : 0;
    chunk +=
      ALPHABET[a >> 2] +
      ALPHABET[((a & 3) << 4) | (b >> 4)] +
      (i + 1 < n ? ALPHABET[((b & 15) << 2) | (c >> 6)] : "=") +
      (i + 2 < n ? ALPHABET[c & 63] : "=");
    // Appending to one ever-growing string is slow on large buffers.
    if (chunk.length >= 8192) {
      out += chunk;
      chunk = "";
    }
  }
  return out + chunk;
}
