/**
 * Detects whether a local image is mostly dark or light.
 *
 * React Native has no pixel API, so the image is resized to a tiny 8x8
 * thumbnail (the average of the photo) with `expo-image-manipulator`, the
 * resulting JPEG is decoded with the pure-JS `jpeg-js` decoder, and the
 * average Rec. 601 luminance decides the tone. Any failure defaults to
 * "dark" (the safe choice → light text on a dark scrim).
 */
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'jpeg-js';

export type CoverTone = 'dark' | 'light';

const LUMINANCE_THRESHOLD = 128;

export async function detectImageTone(uri: string): Promise<CoverTone> {
  try {
    const { base64 } = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 8, height: 8 } }],
      { base64: true, compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    if (!base64) return 'dark';

    const { data } = decode(base64ToBytes(base64), { useTArray: true });

    let sum = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      sum += 0.299 * r + 0.587 * g + 0.114 * b;
      count++;
    }
    const luminance = count > 0 ? sum / count : 0;

    return luminance >= LUMINANCE_THRESHOLD ? 'light' : 'dark';
  } catch (error) {
    console.warn('Could not detect image tone, defaulting to dark:', error);
    return 'dark';
  }
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

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
