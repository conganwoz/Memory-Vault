import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Webcam from 'react-webcam';
import { 
  X, 
  RotateCcw, 
  Zap, 
  ZapOff, 
  Sparkles,
  Users,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { Album, User } from '../../types';
import { db, toTimestamp, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';

interface CameraScreenProps {
  album: Album;
  user: User;
  onClose: () => void;
}

export default function CameraScreen({ album, user, onClose }: CameraScreenProps) {
  const webcamRef = useRef<Webcam>(null);
  const [flash, setFlash] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturing, setCapturing] = useState(false);
  const [lastShot, setLastShot] = useState<string | null>(null);
  const [uploadQueue, setUploadQueue] = useState<number>(0);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Mocking contributor presence
  const activeContributors = [1, 2, 3, 4, 5];

  const capture = useCallback(async () => {
    if (!webcamRef.current || capturing) return;
    
    setCapturing(true);
    const imageSrc = webcamRef.current.getScreenshot();
    
    if (imageSrc) {
      setLastShot(imageSrc);
      setUploadQueue(prev => prev + 1);
      
      // Simulate rapid capture feedback
      setTimeout(() => setCapturing(false), 200);

      // Perform background upload
      uploadMemory(imageSrc);
    }
  }, [webcamRef, capturing]);

  const uploadMemory = async (imageSrc: string) => {
    try {
      const photosRef = collection(db, 'albums', album.id, 'photos');
      const albumRef = doc(db, 'albums', album.id);

      // In real app, we'd upload base64 to Storage. 
      // For demo, we use the captures as if they were uploaded.
      // Since we don't have a storage URL, we'll use a random high-quality placeholder 
      // but mention it's "uploaded" for the demo flow.
      const demoPhotos = [
        'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=800'
      ];
      
      await addDoc(photosRef, {
        albumId: album.id,
        uploaderId: user.userId,
        uploaderName: user.displayName,
        url: demoPhotos[Math.floor(Math.random() * demoPhotos.length)],
        type: 'photo',
        createdAt: toTimestamp(new Date()),
        reactions: { heart: 0 },
        timestampLabel: 'Live Capture'
      });

      await updateDoc(albumRef, {
        photoCount: increment(1)
      });

      setUploadQueue(prev => Math.max(0, prev - 1));
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 2000);
      
    } catch (error) {
      console.error(error);
      setUploadQueue(prev => Math.max(0, prev - 1));
    }
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col">
      {/* Immersive Camera View */}
      <div className="absolute inset-0 z-0">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode: facingMode,
            width: 1280,
            height: 720
          }}
          className="w-full h-full object-cover"
          mirrored={facingMode === 'user'}
          imageSmoothing={true}
          forceScreenshotSourceSize={false}
          onUserMediaError={(err) => console.error("Camera error:", err)}
          disablePictureInPicture={true}
          onUserMedia={() => console.log("Camera started")}
          screenshotQuality={0.92}
        />
        {/* Soft Vignette / Cinematic Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/40 pointer-events-none" />
      </div>

      {/* Top Controls */}
      <header className="relative z-10 p-6 flex justify-between items-start safe-area-top">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/10">
            <div className="w-5 h-5 rounded-lg overflow-hidden bg-brand-charcoal">
               <img src={album.coverPhotoURL} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-white/50 uppercase tracking-widest font-bold">Capturing for</span>
              <span className="text-[10px] text-white font-serif italic truncate max-w-[120px]">{album.title}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-2 px-2">
             <div className="flex -space-x-1.5">
               {activeContributors.map(i => (
                 <div key={i} className="w-5 h-5 rounded-full border border-black/20 overflow-hidden shadow-sm">
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 3}`} alt="" />
                 </div>
               ))}
             </div>
             <span className="text-[8px] text-white/80 font-medium">12 contributors active</span>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="p-3 bg-black/30 backdrop-blur-xl rounded-full border border-white/10 text-white active:scale-90 transition-transform"
        >
          <X className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1" />

      {/* Bottom Interface */}
      <footer className="relative z-10 p-8 pb-12 flex flex-col items-center gap-8">
        {/* Upload Status */}
        <AnimatePresence>
          {(uploadQueue > 0 || showConfirmation) && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="flex items-center gap-3 px-4 py-2 bg-brand-peach/20 backdrop-blur-xl border border-brand-peach/30 rounded-2xl"
            >
              {uploadQueue > 0 ? (
                <>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand-peach fill-brand-peach" />
                  </motion.div>
                  <span className="text-[10px] font-bold text-brand-peach uppercase tracking-[0.2em]">Preserving {uploadQueue} moments...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-[10px] font-bold text-green-400 uppercase tracking-[0.2em]">Memory Saved ✨</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full flex justify-between items-center px-4">
          {/* Gallery Preview */}
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md overflow-hidden flex items-center justify-center">
            {lastShot ? (
              <img src={lastShot} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-5 h-5 text-white/40" />
            )}
          </div>

          {/* Shutter Button */}
          <button 
            onClick={capture}
            disabled={capturing}
            className="group relative flex items-center justify-center"
          >
            <div className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center">
              <motion.div 
                animate={capturing ? { scale: 0.85 } : { scale: 1 }}
                className="w-16 h-16 bg-white rounded-full shadow-2xl flex items-center justify-center transition-transform group-active:scale-95"
              >
                 <div className="w-14 h-14 rounded-full border-2 border-brand-charcoal/5" />
              </motion.div>
            </div>
            {/* Soft Glow */}
            <div className="absolute inset-0 bg-white/10 blur-xl rounded-full -z-10 group-active:scale-125 transition-transform" />
          </button>

          {/* Camera Controls */}
          <div className="flex flex-col gap-4">
             <button 
              onClick={() => setFlash(!flash)}
              className="p-3 bg-black/30 backdrop-blur-xl rounded-full border border-white/10 text-white transition-all active:scale-90"
             >
                {flash ? <Zap className="w-5 h-5 fill-brand-peach text-brand-peach" /> : <ZapOff className="w-5 h-5" />}
             </button>
             <button 
              onClick={toggleFacingMode}
              className="p-3 bg-black/30 backdrop-blur-xl rounded-full border border-white/10 text-white transition-all active:scale-90"
             >
                <RotateCcw className="w-5 h-5" />
             </button>
          </div>
        </div>

        <p className="text-[10px] font-bold text-white/40 tracking-[0.3em] uppercase">Spontaneous Moment</p>
      </footer>

      {/* Capture Flash Effect */}
      <AnimatePresence>
        {capturing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 bg-white z-[100] pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
