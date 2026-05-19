import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Heart, MessageCircle, Share, Download, User, MoreHorizontal } from 'lucide-react';
import { Photo } from '../../types';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

interface PhotoViewerScreenProps {
  photo: Photo;
  onBack: () => void;
}

export default function PhotoViewerScreen({ photo, onBack }: PhotoViewerScreenProps) {
  const [liked, setLiked] = React.useState(false);

  const toggleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    
    try {
      const photoRef = doc(db, 'albums', photo.albumId, 'photos', photo.id);
      await updateDoc(photoRef, {
        "reactions.heart": increment(newLiked ? 1 : -1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `albums/${photo.albumId}/photos/${photo.id}`);
      setLiked(!newLiked); // Revert
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-charcoal text-white">
      <header className="p-8 flex justify-between items-center z-10 absolute top-0 left-0 right-0 safe-area-top bg-gradient-to-b from-black/20 to-transparent">
        <button onClick={onBack} className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 transition-all active:scale-95 flex items-center justify-center">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex gap-3">
          <button className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 transition-all active:scale-95 flex items-center justify-center">
            <Share className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 transition-all active:scale-95 flex items-center justify-center">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-0">
        <motion.img 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          src={photo.url} 
          alt={photo.caption} 
          className="w-full h-auto max-h-[80vh] object-contain shadow-2xl"
          referrerPolicy="no-referrer"
        />
      </div>

      <footer className="p-8 pb-12 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10">
        <div className="flex items-center gap-3 mb-6">
           <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 bg-white/5">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${photo.uploaderName}`} alt={photo.uploaderName} className="w-full h-full object-cover" />
           </div>
           <div>
              <h4 className="text-sm font-semibold">{photo.uploaderName}</h4>
              <p className="text-[10px] text-white/50 uppercase tracking-widest">{photo.timestampLabel || 'Shared moment'}</p>
           </div>
        </div>

        {photo.caption && (
          <p className="text-brand-beige/90 text-sm leading-relaxed mb-8 italic">
            "{photo.caption}"
          </p>
        )}

        <div className="flex items-center gap-6">
           <button 
            onClick={toggleLike}
            className="flex items-center gap-2 group"
          >
             <Heart className={`w-6 h-6 transition-all ${liked ? 'fill-brand-peach text-brand-peach scale-110' : 'text-white'}`} />
             <span className="text-xs font-bold">{(photo.reactions?.heart as number || 0) + (liked ? 1 : 0)}</span>
           </button>
           
           <button className="flex items-center gap-2 group text-white">
             <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
             <span className="text-xs font-bold">0</span>
           </button>

           <div className="flex-1" />

           <button className="p-3 bg-white text-brand-charcoal rounded-full shadow-lg active:scale-95 transition-transform">
              <Download className="w-5 h-5" />
           </button>
        </div>
      </footer>
    </div>
  );
}
