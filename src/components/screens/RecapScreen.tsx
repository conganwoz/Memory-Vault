import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Sparkles, Play, Share2, Download, Heart } from 'lucide-react';
import { Album, Recap } from '../../types';

interface RecapScreenProps {
  album: Album;
  onBack: () => void;
}

export default function RecapScreen({ album, onBack }: RecapScreenProps) {
  const [loading, setLoading] = useState(true);
  const [recap, setRecap] = useState<Recap | null>(null);

  useEffect(() => {
    const fetchRecap = async () => {
      try {
        // In a real app, this calls our server API which uses Gemini
        const response = await fetch('/api/recaps/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            albumTitle: album.title,
            photos: ['ceremony', 'sunset hike', 'laughter', 'dance floor'] 
          }),
        });
        const data = await response.json();
        setRecap({
          id: 'r1',
          albumId: album.id,
          title: data.title || 'A Journey Through Time',
          summary: data.summary || 'Celebrating the beautiful moments we shared together.',
          photoUrls: [
            'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=800'
          ],
          createdAt: new Date().toISOString(),
        });
        setLoading(false);
      } catch (error) {
        console.error(error);
        // Fallback mock
        setRecap({
          id: 'r1',
          albumId: album.id,
          title: 'Echoes of Laughter',
          summary: 'From the quiet preparation to the joyous celebration, every moment we shared is now beautifully preserved in this family vault.',
          photoUrls: [],
          createdAt: new Date().toISOString(),
        });
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchRecap, 2000);
    return () => clearTimeout(timer);
  }, [album]);

  return (
    <div className="flex flex-col h-full bg-brand-charcoal text-white">
      <header className="p-6 flex justify-between items-center z-20">
        <button onClick={onBack} className="p-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-brand-peach">Memories Refined</span>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="relative w-24 h-24 mb-8">
                 <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                    className="absolute inset-0 border-t-2 border-brand-peach rounded-full"
                 />
                 <div className="absolute inset-4 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-brand-peach animate-pulse" />
                 </div>
              </div>
              <h3 className="text-xl font-serif text-brand-beige">Weaving your story...</h3>
              <p className="text-white/40 text-xs mt-2 tracking-widest uppercase">Kindred AI is working</p>
            </motion.div>
          ) : recap && (
            <motion.div 
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full flex flex-col items-center px-10 text-center"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full aspect-[3/4] rounded-[3rem] overflow-hidden shadow-2xl relative mb-12"
              >
                 <img 
                  src={album.coverPhotoURL} 
                  alt="" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                 />
                 <div className="absolute inset-0 bg-brand-charcoal/40 flex flex-col items-center justify-center p-8">
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-20 h-20 bg-white text-brand-charcoal rounded-full flex items-center justify-center shadow-2xl mb-8 pl-1"
                    >
                       <Play className="w-8 h-8 fill-brand-charcoal" />
                    </motion.button>
                    <h3 className="text-2xl font-serif leading-tight">{recap.title}</h3>
                 </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-brand-beige/80 text-lg font-serif italic leading-relaxed mb-12">
                   "{recap.summary}"
                </p>

                <div className="flex gap-4">
                   <button className="flex-1 flex items-center justify-center gap-3 bg-white text-brand-charcoal py-4 rounded-2xl font-bold">
                      <Download className="w-5 h-5" />
                      <span>Save Recap</span>
                   </button>
                   <button className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                      <Share2 className="w-6 h-6" />
                   </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ambient particles background */}
        <div className="absolute inset-0 pointer-events-none">
           {Array.from({ length: 20 }).map((_, i) => (
             <motion.div
              key={i}
              initial={{ 
                x: Math.random() * 400 - 200, 
                y: Math.random() * 800 - 400,
                opacity: 0 
              }}
              animate={{ 
                y: [null, -100],
                opacity: [0, 0.4, 0]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: Math.random() * 4 + 4, 
                delay: Math.random() * 5 
              }}
              className="absolute w-1 h-1 bg-brand-peach rounded-full"
             />
           ))}
        </div>
      </main>
    </div>
  );
}
