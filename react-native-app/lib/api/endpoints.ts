/**
 * Typed API functions for every feature the app needs from the Kindred backend.
 *
 * All functions return the backend's JSON payloads, already shaped like the
 * `User` / `Album` / `Photo` / `Recap` types in `lib/types.ts`.
 */
import { get, post, put, del, apiFormData } from './client';
import type { Album, Photo, Recap, User } from '../types';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authApi = {
  signIn: (email: string, password: string) =>
    post<{ token: string; user: User }>('/auth/signin', { email, password }),

  signUp: (name: string, email: string, password: string) =>
    post<{ token: string; user: User }>('/auth/signup', { name, email, password }),

  google: (idToken: string) =>
    post<{ token: string; user: User }>('/auth/google', { idToken }),
};

// ---------------------------------------------------------------------------
// Current user
// ---------------------------------------------------------------------------

export const meApi = {
  get: async () => (await get<{ user: User }>('/me')).user,

  update: async (attrs: { displayName?: string; photoURL?: string; password?: string }) =>
    (await put<{ user: User }>('/me', attrs)).user,
};

// ---------------------------------------------------------------------------
// Albums
// ---------------------------------------------------------------------------

export interface AlbumInput {
  title: string;
  description?: string;
  coverPhotoURL?: string;
  eventDate?: string;
  privacy?: 'invite' | 'link' | 'qr';
}

export const albumsApi = {
  list: async () => (await get<{ albums: Album[] }>('/albums')).albums,

  get: async (id: string) => (await get<{ album: Album }>(`/albums/${id}`)).album,

  create: async (data: AlbumInput) =>
    (await post<{ album: Album }>('/albums', data)).album,

  update: async (id: string, data: Partial<Album>) =>
    (await put<{ album: Album }>(`/albums/${id}`, data)).album,

  remove: async (id: string) => del<void>(`/albums/${id}`),

  addMember: async (id: string, email: string) =>
    (await post<{ album: Album }>(`/albums/${id}/members`, { email })).album,

  removeMember: async (id: string, userId: string) =>
    (await del<{ album: Album }>(`/albums/${id}/members/${userId}`)).album,
};

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

export const photosApi = {
  list: async (albumId: string) =>
    (await get<{ photos: Photo[] }>(`/albums/${albumId}/photos`)).photos,

  /** Uploads a photo from a base64 payload (small/medium images). */
  create: async (
    albumId: string,
    base64: string,
    opts?: { caption?: string; timestampLabel?: string }
  ) =>
    (
      await post<{ photo: Photo }>(`/albums/${albumId}/photos`, {
        base64,
        caption: opts?.caption,
        timestampLabel: opts?.timestampLabel,
      })
    ).photo,

  /**
   * Uploads a local image file as `multipart/form-data`.
   *
   * This is the RAM-friendly path: React Native streams the file from disk
   * instead of holding a base64 copy in JavaScript memory, and the backend
   * streams it straight to storage.
   */
  uploadFile: async (
    albumId: string,
    file: { uri: string; name?: string; type?: string },
    opts?: { caption?: string; timestampLabel?: string }
  ) => {
    const form = new FormData();
    form.append('photo', {
      uri: file.uri,
      name: file.name ?? 'photo.jpg',
      type: file.type ?? 'image/jpeg',
    } as unknown as Blob);
    if (opts?.caption) form.append('caption', opts.caption);
    if (opts?.timestampLabel) form.append('timestampLabel', opts.timestampLabel);

    const { photo } = await apiFormData<{ photo: Photo }>(
      `/albums/${albumId}/photos`,
      form
    );
    return photo;
  },

  react: async (photoId: string, heart: 1 | -1) =>
    (await post<{ photo: Photo }>(`/photos/${photoId}/reactions`, { heart })).photo,

  remove: async (photoId: string) => del<void>(`/photos/${photoId}`),
};

// ---------------------------------------------------------------------------
// Recaps
// ---------------------------------------------------------------------------

export const recapsApi = {
  generate: async (albumId: string, photos?: string[]) =>
    (await post<{ recap: Recap }>(`/albums/${albumId}/recaps/generate`, { photos })).recap,

  list: async (albumId: string) =>
    (await get<{ recaps: Recap[] }>(`/albums/${albumId}/recaps`)).recaps,
};

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

export interface InviteInfo {
  code: string;
  link: string;
  expiresAt?: string;
  uses: number;
}

export const invitesApi = {
  create: async (albumId: string) =>
    (await post<{ invite: InviteInfo }>(`/albums/${albumId}/invite`)).invite,

  preview: async (code: string) => get<{ invite: Record<string, unknown> }>(`/invites/${code}`),

  accept: async (code: string) =>
    (await post<{ album: Album }>(`/invites/${code}/accept`)).album,
};

// ---------------------------------------------------------------------------
// Generic uploads (album covers etc.)
// ---------------------------------------------------------------------------

export const uploadsApi = {
  uploadBase64: async (base64: string) =>
    (await post<{ url: string }>('/uploads', { base64 })).url,
};
