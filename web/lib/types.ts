export interface User {
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
  plan?: PlanId;
  planExpiresAt?: string;
  createdAt: string;
}

export type PlanId = 'default' | 'basic' | 'pro';

export interface Album {
  id: string;
  title: string;
  description?: string;
  coverPhotoURL: string;
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

export type MomentLabel = 'Morning' | 'Ceremony' | 'Afternoon' | 'Dinner' | 'Party' | 'Late Night';
