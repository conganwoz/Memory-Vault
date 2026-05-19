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
}

export interface Recap {
  id: string;
  albumId: string;
  title: string;
  summary: string;
  photoUrls: string[];
  createdAt: string;
}

export type Screen = 
  | 'splash' 
  | 'login' 
  | 'home' 
  | 'create-album' 
  | 'invite' 
  | 'album-detail' 
  | 'photo-viewer' 
  | 'upload' 
  | 'empty-state' 
  | 'recap'
  | 'camera'
  | 'profile';
