/**
 * Kindred API configuration.
 *
 * The API base URL is resolved with the following priority:
 *
 *   1. `EXPO_PUBLIC_API_URL` env var  → set for a specific environment,
 *      e.g. `EXPO_PUBLIC_API_URL=http://api.kindred.app npx expo start`
 *   2. `expo.extra.apiBaseUrl` in `app.json` → the "config file" for
 *      dev (LAN IP + backend port) and prod (deployed backend URL).
 *   3. Auto-derived from the Expo dev-server host (your machine's LAN IP)
 *      + `expo.extra.apiPort` (default 4008) → dev convenience when
 *      `apiBaseUrl` is left empty.
 *   4. `http://localhost:4008` fallback.
 *
 * Dev example (in app.json):
 *   "extra": { "apiBaseUrl": "http://192.168.1.51:4008", "apiPort": 4008 }
 */
import Constants from 'expo-constants';

export interface AppExtra {
  googleWebClientId?: string;
  googleIosClientId?: string;
  googleAndroidClientId?: string;
  apiBaseUrl?: string;
  apiPort?: number;
}

export const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;

/** Highest priority: explicit env var. */
const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';

/** Config file: app.json → expo.extra.apiBaseUrl. */
const configApiUrl = extra.apiBaseUrl?.trim() ?? '';

/**
 * Dev convenience: when no explicit URL is configured, reuse the host of the
 * Expo dev server (the machine's LAN IP while running `npx expo start`) and
 * point it at the backend port.
 */
function deriveLanApiUrl(): string {
  try {
    const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.51:8081"
    const host = hostUri?.split(':')[0]?.trim();
    if (!host || host === 'localhost' || host === '127.0.0.1') return '';
    const port = extra.apiPort ?? 4008;
    return `http://${host}:${port}`;
  } catch {
    return '';
  }
}

const resolved = (envApiUrl || configApiUrl || deriveLanApiUrl() || 'http://localhost:4008').replace(
  /\/+$/,
  ''
);

/** Base URL of the Kindred backend, e.g. "http://192.168.1.51:4008". */
export const API_BASE_URL = resolved;

/** Base URL + `/api` prefix for all JSON API calls. */
export const API_URL = `${API_BASE_URL}/api`;

/**
 * Resolves a possibly-relative asset URL (e.g. `/uploads/albums/x/y.png`)
 * returned by the backend into an absolute URL the RN `<Image>` can load.
 * Absolute `http(s)://` and inline `data:` URIs pass through unchanged.
 */
export function resolveAssetUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:)/.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Where the app currently points (useful for debugging). */
export const API_ORIGIN_DESCRIPTION = envApiUrl
  ? 'EXPO_PUBLIC_API_URL'
  : configApiUrl
    ? 'app.json (expo.extra.apiBaseUrl)'
    : 'derived from Expo dev server host';
