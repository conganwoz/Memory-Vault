export interface User {
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: string;
}

export interface Album {
  id: string;
  title: string;
  description?: string;
  coverPhotoURL: string;
  /** Luminance class of the cover — used to pick contrasting text. */
  coverTone: 'dark' | 'light';
  eventDate: string;
  ownerId: string;
  members: string[];
  photoCount: number;
  createdAt: string;
  privacy: 'invite' | 'link' | 'qr';
}

export interface Photo {
  id: string;
  albumId: string;
  uploaderId: string;
  uploaderName: string;
  url: string;
  caption?: string;
  type: 'photo' | 'video';
  createdAt: string;
  reactions: Record<string, number>;
  timestampLabel: string;
  /** Set while the photo sits in the album trash (auto-permanently deleted after 7 days). */
  deletedAt?: string;
}

export interface Recap {
  id: string;
  albumId: string;
  title: string;
  summary: string;
  photoUrls: string[];
  createdAt: string;
}

export interface Invitation {
  id: string;
  albumId: string;
  albumTitle?: string;
  inviterId: string;
  inviterName?: string;
  inviteeId: string;
  inviteeEmail?: string;
  inviteeName?: string;
  status: 'pending' | 'accepted';
  createdAt: string;
}