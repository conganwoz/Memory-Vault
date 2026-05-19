import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, Album, Photo } from './types';
import { useFirebase } from './lib/FirebaseProvider';
import SplashScreen from './components/screens/SplashScreen';
import LoginScreen from './components/screens/LoginScreen';
import HomeScreen from './components/screens/HomeScreen';
import CreateAlbumScreen from './components/screens/CreateAlbumScreen';
import AlbumDetailScreen from './components/screens/AlbumDetailScreen';
import InviteScreen from './components/screens/InviteScreen';
import PhotoViewerScreen from './components/screens/PhotoViewerScreen';
import UploadScreen from './components/screens/UploadScreen';
import RecapScreen from './components/screens/RecapScreen';
import ProfileScreen from './components/screens/ProfileScreen';
import CameraScreen from './components/screens/CameraScreen';

export default function App() {
  const { user, loading, albums, signIn, signOut } = useFirebase();
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<Photo | null>(null);

  const activeAlbum = albums.find(a => a.id === activeAlbumId) || null;

  useEffect(() => {
    if (currentScreen === 'splash' && !loading) {
      const timer = setTimeout(() => {
        if (user) {
          setCurrentScreen('home');
        } else {
          setCurrentScreen('login');
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentScreen, loading, user]);

  // Auth sync
  useEffect(() => {
    if (!loading && currentScreen === 'login' && user) {
      setCurrentScreen('home');
    }
    if (!loading && currentScreen !== 'splash' && !user) {
      setCurrentScreen('login');
    }
  }, [user, loading, currentScreen]);

  const handleSelectAlbum = (albumId: string) => {
    setActiveAlbumId(albumId);
    setCurrentScreen('album-detail');
  };

  const handleCreateAlbum = () => {
    setCurrentScreen('create-album');
  };

  if (loading && currentScreen !== 'splash') {
    return (
      <div className="w-full h-screen max-w-md mx-auto bg-brand-cream flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
          <div className="w-8 h-8 border-4 border-brand-peach border-t-transparent rounded-full" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen max-w-md mx-auto bg-brand-cream overflow-hidden shadow-2xl">
      {/* Background Glow Blobs */}
      <div className="absolute top-[-100px] right-[-100px] w-80 h-80 bg-brand-glow opacity-30 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[-100px] w-64 h-64 bg-brand-beige opacity-50 rounded-full blur-[60px] pointer-events-none" />

      <AnimatePresence mode="wait">
        {currentScreen === 'splash' && (
          <motion.div key="splash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <SplashScreen onComplete={() => {}} />
          </motion.div>
        )}
        
        {currentScreen === 'login' && !user && (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <LoginScreen onLogin={signIn} />
          </motion.div>
        )}

        {currentScreen === 'home' && user && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <HomeScreen 
              user={user} 
              albums={albums} 
              onSelectAlbum={(a) => handleSelectAlbum(a.id)}
              onCreateAlbum={handleCreateAlbum}
              onNavigate={(s) => setCurrentScreen(s as Screen)}
            />
          </motion.div>
        )}

        {currentScreen === 'profile' && user && (
          <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <ProfileScreen 
              user={user} 
              albums={albums} 
              onSignOut={() => {
                if(confirm('Sign out?')) signOut();
              }}
              onNavigate={(s) => setCurrentScreen(s as Screen)}
              onCreateAlbum={handleCreateAlbum}
            />
          </motion.div>
        )}

        {currentScreen === 'create-album' && (
          <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <CreateAlbumScreen 
              onBack={() => setCurrentScreen('home')}
              onCreated={(album) => {
                // Provider handles adding it to state through snapshots
                handleSelectAlbum(album.id);
              }}
            />
          </motion.div>
        )}

        {currentScreen === 'album-detail' && activeAlbum && (
          <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <AlbumDetailScreen 
              album={activeAlbum} 
              onBack={() => setCurrentScreen('home')}
              onInvite={() => setCurrentScreen('invite')}
              onUpload={() => setCurrentScreen('upload')}
              onCamera={() => setCurrentScreen('camera')}
              onViewPhoto={(photo) => {
                setViewingPhoto(photo);
                setCurrentScreen('photo-viewer');
              }}
              onRecap={() => setCurrentScreen('recap')}
            />
          </motion.div>
        )}

        {currentScreen === 'invite' && activeAlbum && (
          <motion.div key="invite" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <InviteScreen 
              album={activeAlbum} 
              onBack={() => setCurrentScreen('album-detail')} 
            />
          </motion.div>
        )}

        {currentScreen === 'photo-viewer' && viewingPhoto && (
          <motion.div key="viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <PhotoViewerScreen 
              photo={viewingPhoto} 
              onBack={() => setCurrentScreen('album-detail')} 
            />
          </motion.div>
        )}

        {currentScreen === 'upload' && activeAlbum && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <UploadScreen 
              album={activeAlbum} 
              onBack={() => setCurrentScreen('album-detail')} 
              onComplete={() => setCurrentScreen('album-detail')}
            />
          </motion.div>
        )}

        {currentScreen === 'recap' && activeAlbum && (
          <motion.div key="recap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <RecapScreen 
              album={activeAlbum} 
              onBack={() => setCurrentScreen('album-detail')} 
            />
          </motion.div>
        )}

        {currentScreen === 'camera' && activeAlbum && user && (
          <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <CameraScreen 
              album={activeAlbum}
              user={user}
              onClose={() => setCurrentScreen('album-detail')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
