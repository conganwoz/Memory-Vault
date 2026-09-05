import { API_URL } from '../config';

const TOKEN_KEY = 'kindred_token';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Token persistence (localStorage — web app runs on the same origin)
// ---------------------------------------------------------------------------

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

export async function api<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await doFetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(json, response.status), response.status);
  }

  return json as T;
}

/** POSTs `multipart/form-data` (streams a local File to the backend). */
export async function apiFormData<T = unknown>(path: string, form: FormData): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await doFetch(`${API_URL}${path}`, { method: 'POST', headers, body: form });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(json, response.status), response.status);
  }
  return json as T;
}

/** Runs `worker` over `items` with at most `concurrency` workers at a time. */
export async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  if (items.length === 0) return;
  const workers = Math.max(1, Math.min(concurrency, items.length));
  let next = 0;

  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (next < items.length) {
        const index = next++;
        await worker(items[index], index);
      }
    })
  );
}

export async function get<T = unknown>(path: string): Promise<T> {
  return api<T>(path);
}

export async function post<T = unknown>(path: string, body?: unknown): Promise<T> {
  return api<T>(path, { method: 'POST', body });
}

export async function put<T = unknown>(path: string, body?: unknown): Promise<T> {
  return api<T>(path, { method: 'PUT', body });
}

export async function del<T = void>(path: string): Promise<T> {
  return api<T>(path, { method: 'DELETE' });
}

async function doFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ApiError(
      `Network error — could not reach the Kindred server at ${API_URL}. Check that the backend is running.`,
      0
    );
  }
}

function extractErrorMessage(json: unknown, status: number): string {
  if (json && typeof json === 'object') {
    const errors = (json as { errors?: unknown }).errors;
    if (errors && typeof errors === 'object') {
      const detail = (errors as { detail?: unknown }).detail;
      if (typeof detail === 'string' && detail.length > 0) return detail;

      const firstValue = Object.values(errors as Record<string, unknown>)[0];
      if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') {
        return firstValue[0];
      }
      if (typeof firstValue === 'string') return firstValue;
    }
    const error = (json as { error?: unknown }).error;
    if (typeof error === 'string' && error.length > 0) return error;
  }

  if (status === 401) return 'Unauthorized — please sign in again.';
  if (status === 403) return 'You do not have permission to do this.';
  if (status === 404) return 'Not found.';
  if (status >= 500) return 'The Kindred server hit an error. Please try again.';
  return `Request failed (${status}).`;
}
