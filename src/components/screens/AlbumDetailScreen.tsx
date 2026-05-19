import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ChevronLeft, Share2, Upload, Sparkles, MessageCircle, Heart, MoreVertical, Plus, Camera } from 'lucide-react';
import { Album, Photo } from '../../types';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

interface AlbumDetailScreenProps {
  album: Album;
  onBack: () => void;
  onInvite: () => void;
  onUpload: () => void;
  onCamera: () => void;
  onViewPhoto: (photo: Photo) => void;
  onRecap: () => void;
}

export default function AlbumDetailScreen({ album, onBack, onInvite, onUpload, onCamera, onViewPhoto, onRecap }: AlbumDetailScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  const { scrollY } = useScroll({
    container: containerRef
  });

  const headerOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const headerScale = useTransform(scrollY, [0, 400], [1, 1.1]);
  const headerY = useTransform(scrollY, [0, 400], [0, 150]);
  const infoOpacity = useTransform(scrollY, [0, 200], [1, 0]);
  const infoY = useTransform(scrollY, [0, 200], [0, -50]);

  useEffect(() => {
    const q = query(
      collection(db, 'albums', album.id, 'photos'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const photoList: Photo[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString()
        } as Photo;
      });
      setPhotos(photoList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `albums/${album.id}/photos`);
    });

    return () => unsubscribe();
  }, [album.id]);

  // Group photos by their timestampLabel
  const sections = photos.reduce((acc, photo) => {
    const label = photo.timestampLabel || 'Moments';
    if (!acc[label]) acc[label] = [];
    acc[label].push(photo);
    return acc;
  }, {} as Record<string, Photo[]>);

  return (
    <div className="flex flex-col h-full bg-brand-cream overflow-y-auto overflow-x-hidden scroll-smooth" ref={containerRef}>
      {/* Immersive Header */}
      <header className="relative w-full h-[500px] flex-shrink-0 overflow-hidden">
        <motion.div 
          style={{ opacity: headerOpacity, scale: headerScale, y: headerY }}
          className="absolute inset-0"
        >
          <img 
            src={album.coverPhotoURL} 
            alt={album.title} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-cream via-brand-charcoal/30 to-transparent" />
        </motion.div>
        
        {/* Top Buttons (Fixed relative to the parent header) */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20 safe-area-top">
          <button onClick={onBack} className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-full text-white border border-white/20 transition-all active:scale-95 flex items-center justify-center">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex gap-2">
            <button onClick={onInvite} className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-full text-white border border-white/20 transition-all active:scale-95 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-full text-white border border-white/20 transition-all active:scale-95 flex items-center justify-center">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Album Hero Info */}
        <motion.div 
          style={{ opacity: infoOpacity, y: infoY }}
          className="absolute bottom-12 left-8 right-8 text-brand-charcoal z-10"
        >
            <h1 className="text-5xl font-serif leading-tight mb-2 tracking-tight">{album.title}</h1>
            <p className="text-sm font-medium opacity-60 mb-8 font-serif italic">
                {album.eventDate ? format(new Date(album.eventDate), 'MMMM d, yyyy') : 'Date not set'}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex -space-x-3">
                {album.members.slice(0, 5).map((member, i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-brand-cream bg-brand-beige overflow-hidden shadow-sm">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member}`} alt="Member" className="w-full h-full object-cover" />
                  </div>
                ))}
                {album.members.length > 5 && (
                    <div className="w-10 h-10 rounded-full border-2 border-brand-cream bg-brand-beige flex items-center justify-center text-[10px] font-bold shadow-sm">
                        +{album.members.length - 5}
                    </div>
                )}
                <button onClick={onInvite} className="w-10 h-10 rounded-full border-2 border-brand-cream bg-brand-peach text-white flex items-center justify-center shadow-lg active:scale-95 transition-all">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              <button 
                onClick={onRecap}
                className="flex items-center gap-2 px-6 py-3 bg-brand-charcoal text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl active:scale-95 transition-transform"
              >
                <Sparkles className="w-4 h-4 text-brand-peach fill-brand-peach" />
                Memory Recap
              </button>
            </div>
        </motion.div>
      </header>

      {/* Timeline Content */}
      <main className="relative z-20 bg-brand-cream rounded-t-[3rem] -mt-10 pt-12 px-6 pb-32 min-h-screen shadow-[0_-20px_40px_rgba(0,0,0,0.05)]">
        <div className="w-12 h-1.5 bg-brand-charcoal/5 rounded-full mx-auto mb-8 opacity-20" />
        <div className="timeline-line left-1/2 -translate-x-1/2 opacity-10" />
        
        {loading ? (
            <div className="flex justify-center py-10">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                    <div className="w-6 h-6 border-2 border-brand-charcoal/20 border-t-brand-peach rounded-full" />
                </motion.div>
            </div>
        ) : photos.length === 0 ? (
            <div className="text-center py-20 opacity-40 italic font-serif">
                Every memory starts with a single photo.<br/>
                Tap the button below to add yours.
            </div>
        ) : (
            <div className="space-y-16">
            {Object.entries(sections).map(([label, sectionPhotos], sIndex) => (
                <div key={label} className="relative z-10">
                {/* Section Header */}
                <div className="flex justify-center mb-8">
                    <div className="px-4 py-1.5 bg-brand-beige text-[10px] font-bold uppercase tracking-[0.2em] rounded-full border border-brand-charcoal/5 text-brand-muted shadow-sm">
                    {label}
                    </div>
                </div>

                {/* Masonry / Scrapbook Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {(sectionPhotos as Photo[]).map((photo, pIndex) => (
                    <motion.div
                        key={photo.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: pIndex * 0.1 }}
                        onClick={() => onViewPhoto(photo)}
                        className={cn(
                        "relative rounded-2xl overflow-hidden shadow-md cursor-pointer group",
                        pIndex % 3 === 0 ? "h-64 col-span-1" : "h-48 col-span-1",
                        pIndex % 4 === 1 ? "mt-8" : ""
                        )}
                    >
                        <img 
                        src={photo.url} 
                        alt="" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="absolute bottom-3 left-3 flex items-center gap-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1">
                            <Heart className="w-3 h-3 fill-white" />
                            <span className="text-[10px] font-bold">{(photo.reactions?.heart as number) || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3 fill-white" />
                            <span className="text-[10px] font-bold">0</span>
                        </div>
                        </div>
                    </motion.div>
                    ))}
                </div>
                </div>
            ))}
            </div>
        )}
      </main>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-10 right-8 flex flex-col gap-4 z-30 items-end">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onUpload}
          className="w-12 h-12 bg-white text-brand-charcoal rounded-2xl flex items-center justify-center shadow-lg border border-brand-charcoal/5"
        >
          <Upload className="w-5 h-5" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCamera}
          className="w-16 h-16 bg-brand-charcoal text-white rounded-2xl flex items-center justify-center shadow-2xl ring-4 ring-brand-peach/10"
        >
          <Camera className="w-8 h-8" />
        </motion.button>
      </div>
    </div>
  );
}
