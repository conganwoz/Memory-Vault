'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { authApi, meApi, albumsApi } from './api/endpoints';
import { getToken, setToken, clearToken } from './api/client';
import type { User, Album } from './types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  albums: Album[];
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<string>;
  signInGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  createAlbum: (albumData: Partial<Album>) => Promise<string>;
  refreshAlbums: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [albums, setAlbums] = useState<Album[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = getToken();
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const currentUser = await meApi.get();
        if (!cancelled) setUser(currentUser);
      } catch {
        clearToken();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshAlbums = useCallback(async () => {
    try {
      const list = await albumsApi.list();
      setAlbums(list);
    } catch (error) {
      console.warn('Failed to load albums:', error);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setAlbums([]);
      return;
    }
    void refreshAlbums();
  }, [user, refreshAlbums]);

  const applySession = useCallback(async (token: string, currentUser: User) => {
    setToken(token);
    setUser(currentUser);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      albums,

      async signIn(email, password) {
        const { token, user: currentUser } = await authApi.signIn(email, password);
        await applySession(token, currentUser);
      },

      async signUp(name, email, password) {
        const { message } = await authApi.signUp(name, email, password);
        return message;
      },

      async signInGoogle(idToken) {
        const { token, user: currentUser } = await authApi.google(idToken);
        await applySession(token, currentUser);
      },

      async signOut() {
        clearToken();
        setUser(null);
        setAlbums([]);
      },

      async createAlbum(albumData) {
        if (!user) throw new Error('You must be signed in.');
        const album = await albumsApi.create({
          title: albumData.title ?? 'Untitled Vault',
          description: albumData.description,
          coverPhotoURL: albumData.coverPhotoURL,
          coverTone: albumData.coverTone,
          eventDate: albumData.eventDate,
          privacy: albumData.privacy ?? 'invite',
        });
        void refreshAlbums();
        return album.id;
      },

      refreshAlbums,
    }),
    [user, loading, albums, refreshAlbums, applySession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
