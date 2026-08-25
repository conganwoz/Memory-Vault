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

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  albums: Album[];
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  createAlbum: (albumData: Partial<Album>) => Promise<string>;
  refreshAlbums: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(
  undefined
);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [albums, setAlbums] = useState<Album[]>([]);

  // Restore the session from the stored JWT (if any).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await getToken();
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const currentUser = await meApi.get();
        if (!cancelled) setUser(currentUser);
      } catch {
        // Stale/expired token — clear it and treat the user as signed out.
        await clearToken();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch the user's albums whenever the signed-in user changes.
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
    await setToken(token);
    setUser(currentUser);
  }, []);

  const value = useMemo<FirebaseContextType>(
    () => ({
      user,
      loading,
      albums,

      async signIn(email, password) {
        const { token, user: currentUser } = await authApi.signIn(email, password);
        await applySession(token, currentUser);
      },

      async signUp(name, email, password) {
        const { token, user: currentUser } = await authApi.signUp(name, email, password);
        await applySession(token, currentUser);
      },

      async signInGoogle(idToken) {
        const { token, user: currentUser } = await authApi.google(idToken);
        await applySession(token, currentUser);
      },

      async signOut() {
        await clearToken();
        setUser(null);
        setAlbums([]);
      },

      async createAlbum(albumData) {
        if (!user) throw new Error('You must be signed in.');
        const album = await albumsApi.create({
          title: albumData.title ?? 'Untitled Vault',
          description: albumData.description,
          coverPhotoURL: albumData.coverPhotoURL,
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

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}
