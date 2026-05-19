import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Copy, Share2, Users, Check } from 'lucide-react';
import { Album } from '../../types';

interface InviteScreenProps {
  album: Album;
  onBack: () => void;
}

export default function InviteScreen({ album, onBack }: InviteScreenProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-brand-cream relative">
      <header className="p-8 pb-4 flex justify-between items-center bg-transparent sticky top-0 z-10">
        <button onClick={onBack} className="w-10 h-10 bg-white shadow-sm border border-brand-charcoal/5 flex items-center justify-center rounded-2xl active:scale-95 transition-all">
          <ChevronLeft className="w-6 h-6 text-brand-charcoal" />
        </button>
        <h2 className="text-lg font-serif italic text-brand-charcoal">Invite Loved Ones</h2>
        <div className="w-10" />
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-4">
        <motion.div 
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           className="flex flex-col items-center mt-6"
        >
          <div className="w-24 h-24 bg-white rounded-3xl border border-brand-beige flex items-center justify-center mb-8 shadow-sm">
            <div className="w-14 h-14 bg-brand-peach rounded-2xl flex items-center justify-center text-white text-xs font-bold shadow-lg">QR</div>
          </div>
          
          <h3 className="text-2xl font-serif text-brand-charcoal mb-4 text-center">Preserve memories, together.</h3>
          <p className="text-brand-muted text-sm leading-relaxed mb-10 text-center max-w-[280px]">
            Let others add their perspective to <span className="font-bold text-brand-charcoal italic">"{album.title}"</span>
          </p>

          <div className="w-full p-5 bg-brand-beige rounded-3xl flex items-center justify-between mb-6 border border-brand-charcoal/5 shadow-inner">
            <span className="text-[11px] font-mono truncate mr-2 text-brand-charcoal/40">kindred.app/invite/a7k2...</span>
            <button onClick={handleCopy} className="text-[10px] font-bold text-brand-peach uppercase tracking-widest hover:underline">
               {copied ? 'COPIED' : 'COPY'}
            </button>
          </div>
          
          <button className="w-full py-5 bg-brand-charcoal text-white rounded-3xl text-xs font-bold tracking-[0.2em] uppercase shadow-2xl active:scale-95 transition-all mb-12">
            Share Invite Link
          </button>
        </motion.div>

        <div className="space-y-6">
           <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-muted ml-1">Current Contributors</h4>
           <div className="flex -space-x-3">
              {album.members.slice(0, 8).map((member, i) => (
                <motion.div 
                  key={member}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="w-11 h-11 rounded-full border-2 border-brand-cream overflow-hidden shadow-md bg-brand-beige"
                >
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member}`} alt="Member" className="w-full h-full object-cover" />
                </motion.div>
              ))}
              {album.members.length > 8 && (
                 <div className="w-11 h-11 rounded-full border-2 border-brand-cream bg-brand-beige flex items-center justify-center text-[10px] font-bold text-brand-muted shadow-md">
                   +{album.members.length - 8}
                 </div>
              )}
           </div>
        </div>
      </main>
    </div>
  );
}
