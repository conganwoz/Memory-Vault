/**
 * Artistic color filters for the camera ("Fuji", "B&W", "Sepia", ...).
 *
 * Pure-JS so it works in Expo Go (no native modules): the captured photo is
 * resized with expo-image-manipulator, decoded with jpeg-js, the 4x5 color
 * matrix is applied per pixel, re-encoded, and returned as base64 for the
 * existing base64 photo upload endpoint.
 */
import { Image } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode, encode } from 'jpeg-js';
import { Buffer } from 'buffer';

// jpeg-js's encoder returns `Buffer.from(...)`; Metro doesn't provide a global
// Buffer, so install the `buffer` package's implementation once.
const g = globalThis as unknown as { Buffer?: typeof Buffer };
if (!g.Buffer) g.Buffer = Buffer;

export interface PhotoFilter {
  id: string;
  label: string;
  /** 4x5 color matrix — each row [R,G,B,A,offset] → one output channel. */
  matrix: number[][];
}

const IDENTITY = [
  [1, 0, 0, 0, 0],
  [0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 0, 1, 0],
];

/** Fujifilm-style: warm, slightly muted film tones with lifted blacks. */
const FUJI = [
  [1.05, 0.0, 0.0, 0, 12],
  [0.0, 1.0, 0.05, 0, 8],
  [0.0, 0.08, 0.9, 0, 14],
  [0, 0, 0, 1, 0],
];

/** Classic grayscale (Rec. 601 luminance). */
const BLACK_WHITE = [
  [0.299, 0.587, 0.114, 0, 0],
  [0.299, 0.587, 0.114, 0, 0],
  [0.299, 0.587, 0.114, 0, 0],
  [0, 0, 0, 1, 0],
];

/** Vintage sepia. */
const SEPIA = [
  [0.393, 0.769, 0.189, 0, 0],
  [0.349, 0.686, 0.168, 0, 0],
  [0.272, 0.534, 0.131, 0, 0],
  [0, 0, 0, 1, 0],
];

/** Saturated, punchy colors (saturation ≈ 1.35). */
const VIVID = [
  [1.245, -0.205, -0.04, 0, 0],
  [-0.105, 1.145, -0.04, 0, 0],
  [-0.105, -0.205, 1.31, 0, 0],
  [0, 0, 0, 1, 0],
];

/** High-contrast black & white. */
const NOIR = [
  [0.449, 0.881, 0.171, 0, -64],
  [0.449, 0.881, 0.171, 0, -64],
  [0.449, 0.881, 0.171, 0, -64],
  [0, 0, 0, 1, 0],
];

export const FILTERS: PhotoFilter[] = [
  { id: 'original', label: 'Original', matrix: IDENTITY },
  { id: 'fuji', label: 'Fuji', matrix: FUJI },
  { id: 'bw', label: 'B&W', matrix: BLACK_WHITE },
  { id: 'sepia', label: 'Sepia', matrix: SEPIA },
  { id: 'vivid', label: 'Vivid', matrix: VIVID },
  { id: 'noir', label: 'Noir', matrix: NOIR },
];

/** Long-edge cap for filtered captures (keeps jpeg-js processing fast). */
const MAX_DIM = 1080;

/**
 * Resizes the captured photo, applies the filter's color matrix, and re-encodes
 * it. Returns the processed JPEG as a base64 string (ready for the base64
 * photo upload endpoint).
 */
export async function applyPhotoFilter(uri: string, filter: PhotoFilter): Promise<string> {
  const { base64 } = await ImageManipulator.manipulateAsync(
    uri,
    await resizeActionFor(uri),
    { base64: true, compress: 0.88, format: ImageManipulator.SaveFormat.JPEG }
  );
  if (!base64) throw new Error('Could not read the captured photo.');

  const jpeg = decode(base64ToBytes(base64), { useTArray: true });
  applyMatrix(jpeg.data, filter.matrix);

  const encoded = encode(jpeg, 88);
  return bytesToBase64(encoded.data);
}

/** Resizes to cap the LONG edge at MAX_DIM (preserves aspect ratio). */
function resizeActionFor(uri: string): Promise<ImageManipulator.Action[]> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => {
        resolve(
          width >= height
            ? [{ resize: { width: MAX_DIM } }]
            : [{ resize: { height: MAX_DIM } }]
        );
      },
      () => resolve([{ resize: { width: MAX_DIM } }])
    );
  });
}

function applyMatrix(data: Uint8Array, matrix: number[][]) {
  const [r, g, b] = matrix;
  const r0 = r[4] ?? 0;
  const g0 = g[4] ?? 0;
  const b0 = b[4] ?? 0;
  for (let i = 0; i < data.length; i += 4) {
    const rIn = data[i] ?? 0;
    const gIn = data[i + 1] ?? 0;
    const bIn = data[i + 2] ?? 0;
    data[i] = clamp(r[0] * rIn + r[1] * gIn + r[2] * bIn + r0);
    data[i + 1] = clamp(g[0] * rIn + g[1] * gIn + g[2] * bIn + g0);
    data[i + 2] = clamp(b[0] * rIn + b[1] * gIn + b[2] * bIn + b0);
  }
}

const clamp = (v: number): number =>
  v < 0 ? 0 : v > 255 ? 255 : Math.round(v);

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Bytes → base64 without relying on Node `Buffer` (Hermes-safe). */
function bytesToBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64_CHARS[b0 >> 2];
    out += B64_CHARS[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? '=' : B64_CHARS[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? '=' : B64_CHARS[b2 & 63];
    if (out.length >= 8192) {
      chunks.push(out);
      out = '';
    }
  }
  chunks.push(out);
  return chunks.join('');
}

/** Base64 → bytes without relying on Node `Buffer` (Hermes-safe). */
function base64ToBytes(base64: string): Uint8Array {
  const cleaned = base64.replace(/=+$/, '');
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of cleaned) {
    const value = B64_CHARS.indexOf(ch);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

