import { get, post, put, del, apiFormData } from './client';
import type { Album, Invitation, Photo, Recap, User } from '../types';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authApi = {
  signIn: (email: string, password: string) =>
    post<{ token: string; user: User }>('/auth/signin', { email, password }),

  signUp: (name: string, email: string, password: string) =>
    post<{ message: string }>('/auth/signup', { name, email, password }),

  resendVerification: (email: string) =>
    post<{ message: string }>('/auth/resend-verification', { email }),

  google: (idToken: string) => post<{ token: string; user: User }>('/auth/google', { idToken }),
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
  coverTone?: 'dark' | 'light';
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
};

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

export const photosApi = {
  list: async (albumId: string, opts?: { deleted?: boolean }) =>
    (
      await get<{ photos: Photo[] }>(
        `/albums/${albumId}/photos${opts?.deleted ? '?deleted=true' : ''}`
      )
    ).photos,

  uploadFile: async (
    albumId: string,
    file: File,
    opts?: { caption?: string; timestampLabel?: string }
  ) => {
    const form = new FormData();
    form.append('photo', file, file.name ?? 'photo.jpg');
    if (opts?.caption) form.append('caption', opts.caption);
    if (opts?.timestampLabel) form.append('timestampLabel', opts.timestampLabel);

    const { photo } = await apiFormData<{ photo: Photo }>(`/albums/${albumId}/photos`, form);
    return photo;
  },

  react: async (photoId: string, heart: 1 | -1) =>
    (await post<{ photo: Photo }>(`/photos/${photoId}/reactions`, { heart })).photo,

  remove: async (photoId: string) => del<void>(`/photos/${photoId}`),

  restore: async (photoId: string) =>
    (await post<{ photo: Photo }>(`/photos/${photoId}/restore`)).photo,
};

// ---------------------------------------------------------------------------
// Recaps
// ---------------------------------------------------------------------------

export const recapsApi = {
  generate: async (albumId: string, photos?: string[]) =>
    (await post<{ recap: Recap }>(`/albums/${albumId}/recaps/generate`, { photos })).recap,
};

// ---------------------------------------------------------------------------
// Invitations (email-based)
// ---------------------------------------------------------------------------

export const invitationsApi = {
  create: async (albumId: string, email: string) =>
    (
      await post<{ invitation: Invitation }>(`/albums/${albumId}/invitations`, {
        email,
      })
    ).invitation,

  listForAlbum: async (albumId: string) =>
    (await get<{ invitations: Invitation[] }>(`/albums/${albumId}/invitations`)).invitations,

  revoke: async (id: string) => del<void>(`/invitations/${id}`),

  listMine: async () => (await get<{ invitations: Invitation[] }>('/invitations')).invitations,

  accept: async (id: string) =>
    (await post<{ album: Album }>(`/invitations/${id}/accept`)).album,

  decline: async (id: string) => post<void>(`/invitations/${id}/decline`),
};

// ---------------------------------------------------------------------------
// Generic uploads (album covers etc.)
// ---------------------------------------------------------------------------

export const uploadsApi = {
  uploadFile: async (file: File) => {
    const form = new FormData();
    form.append('photo', file, file.name ?? 'cover.jpg');
    const { url } = await apiFormData<{ url: string }>('/uploads', form);
    return url;
  },
};
