import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Camera, Calendar as CalendarIcon, Globe, Lock, Share2, Sparkles } from 'lucide-react';
import { Album } from '../../types';
import { useFirebase } from '../../lib/FirebaseProvider';

interface CreateAlbumScreenProps {
  onBack: () => void;
  onCreated: (album: Album) => void;
}

export default function CreateAlbumScreen({ onBack, onCreated }: CreateAlbumScreenProps) {
  const { createAlbum } = useFirebase();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [privacy, setPrivacy] = useState<'invite' | 'link' | 'qr'>('invite');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!title) return;
    setIsCreating(true);
    
    try {
      await createAlbum({
        title,
        eventDate: new Date(date).toISOString(),
        privacy,
        coverPhotoURL: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800',
      });
      // We don't have the ID immediately here because onSnapshot will find it, 
      // but for better UX we might want the addDoc to return the ID.
      // For now, let's just go back and let the real-time listener update the UI.
      onBack();
    } catch (error) {
      console.error(error);
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-cream relative">
      <header className="p-8 pb-4 flex justify-between items-center bg-transparent sticky top-0 z-10">
        <button onClick={onBack} className="w-10 h-10 bg-white shadow-sm border border-brand-charcoal/5 flex items-center justify-center rounded-2xl active:scale-95 transition-all">
          <ChevronLeft className="w-6 h-6 text-brand-charcoal" />
        </button>
        <h2 className="text-lg font-serif italic text-brand-charcoal">New Memory Vault</h2>
        <div className="w-10" />
      </header>

      <main className="p-8 flex-1 overflow-y-auto">
        <div className="flex flex-col items-center mb-12">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="w-48 h-64 bg-white border-2 border-dashed border-brand-charcoal/5 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:border-brand-peach transition-all shadow-sm"
          >
            <Camera className="w-10 h-10 text-brand-muted mb-4 opacity-40" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-muted">Vault Cover</span>
          </motion.div>
        </div>

        <div className="space-y-10">
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-muted ml-1">Vault Title</label>
            <input 
              type="text" 
              placeholder="Summer in Tuscany..." 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white border-none rounded-2xl p-5 text-brand-charcoal focus:ring-2 focus:ring-brand-peach/50 transition-all shadow-sm font-serif text-lg"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-muted ml-1">Memorable Date</label>
            <div className="relative">
               <CalendarIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
               <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border-none rounded-2xl p-5 pl-14 text-brand-charcoal focus:ring-2 focus:ring-brand-peach/50 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-muted ml-1">Access Tier</label>
            <div className="grid grid-cols-1 gap-4">
              {[
                { id: 'invite', label: 'Close Family', icon: Lock, desc: 'Only explicitly invited loved ones' },
                { id: 'link', label: 'Public Link', icon: Globe, desc: 'Anyone with the secret link' },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setPrivacy(option.id as any)}
                  className={`flex items-center gap-4 p-5 rounded-3xl text-left border-2 transition-all ${
                    privacy === option.id 
                    ? 'bg-brand-peach/5 border-brand-peach' 
                    : 'bg-white border-transparent shadow-sm'
                  }`}
                >
                  <div className={`p-3 rounded-2xl ${privacy === option.id ? 'bg-brand-peach text-white' : 'bg-brand-beige text-brand-muted'}`}>
                    <option.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-brand-charcoal">{option.label}</h4>
                    <p className="text-[10px] text-brand-muted uppercase tracking-wider">{option.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="p-8 pb-10 bg-transparent">
        <button 
          onClick={handleCreate}
          disabled={!title || isCreating}
          className="w-full bg-brand-charcoal text-white py-5 rounded-2xl font-bold tracking-[0.2em] uppercase text-xs shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
        >
          {isCreating ? 'Fortifying Vault...' : 'Initialize Memory Vault'}
        </button>
      </footer>
    </div>
  );
}
