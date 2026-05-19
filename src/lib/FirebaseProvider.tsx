import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  logout, 
  testConnection,
  handleFirestoreError,
  OperationType,
  toTimestamp
} from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc,
  getDoc,
  addDoc
} from 'firebase/firestore';
import { User, Album } from '../types';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  albums: Album[];
  createAlbum: (albumData: Partial<Album>) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [albums, setAlbums] = useState<Album[]>([]);

  useEffect(() => {
    testConnection();
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const userProfile: User = {
          userId: fbUser.uid,
          displayName: fbUser.displayName || 'Anonymous User',
          email: fbUser.email || '',
          photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${fbUser.uid}`,
          createdAt: new Date().toISOString()
        };

        // Sync profile to Firestore
        try {
          await setDoc(doc(db, 'users', fbUser.uid), {
            ...userProfile,
            createdAt: toTimestamp(userProfile.createdAt)
          }, { merge: true });
        } catch (error) {
          console.error("Sync Profile Error:", error);
        }

        setUser(userProfile);
      } else {
        setUser(null);
        setAlbums([]);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen for albums where user is a member
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'albums'),
      where('members', 'array-contains', user.userId)
    );

    const unsubscribeAlbums = onSnapshot(q, (snapshot) => {
      const albumList: Album[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          eventDate: data.eventDate ? data.eventDate.toDate().toISOString() : new Date().toISOString(),
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString()
        } as Album;
      });
      setAlbums(albumList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'albums');
    });

    return () => unsubscribeAlbums();
  }, [user]);

  const signIn = async () => {
    await signInWithGoogle();
  };

  const signOut = async () => {
    await logout();
  };

  const createAlbum = async (albumData: Partial<Album>) => {
    if (!user) return;
    
    try {
      const albumRef = collection(db, 'albums');
      await addDoc(albumRef, {
        ...albumData,
        ownerId: user.userId,
        members: [user.userId],
        photoCount: 0,
        createdAt: toTimestamp(new Date()),
        eventDate: toTimestamp(albumData.eventDate || new Date())
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'albums');
    }
  };

  return (
    <FirebaseContext.Provider value={{ user, loading, signIn, signOut, albums, createAlbum }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error('useFirebase must be used within a FirebaseProvider');
  return context;
};
