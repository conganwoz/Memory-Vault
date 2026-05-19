import React from 'react';
import { motion } from 'motion/react';
import { Plus, Home, User as UserIcon, Calendar, Camera } from 'lucide-react';
import { User, Album } from '../../types';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

interface HomeScreenProps {
  user: User;
  albums: Album[];
  onSelectAlbum: (album: Album) => void;
  onCreateAlbum: () => void;
  onNavigate: (screen: string) => void;
}

export default function HomeScreen({ user, albums, onSelectAlbum, onCreateAlbum, onNavigate }: HomeScreenProps) {
  return (
    <div className="flex flex-col h-full bg-transparent relative">
      {/* Header */}
      <header className="p-8 pb-4 flex justify-between items-center bg-transparent sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-serif text-brand-charcoal">Good morning,</h2>
          <h2 className="text-3xl font-serif text-brand-peach">{user.displayName.split(' ')[0]}</h2>
        </div>
        <button onClick={() => onNavigate('profile')} className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-brand-charcoal/5 shadow-sm">
          <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 pb-32">
        <div className="flex items-center justify-between mt-8 mb-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-muted">Your Memories</h3>
          <button onClick={onCreateAlbum} className="text-brand-muted hover:text-brand-charcoal transition-colors">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-10">
          {albums.map((album, index) => (
            <motion.div
              key={album.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onSelectAlbum(album)}
              className="group cursor-pointer"
            >
              <div className="relative">
                {/* Book stack effect */}
                <div className="absolute inset-0 bg-brand-charcoal/5 rounded-[2rem] translate-x-2 translate-y-2 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform" />
                <div className="absolute inset-0 bg-brand-charcoal/10 rounded-[2rem] translate-x-1 translate-y-1 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform" />
                
                <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/40">
                  <img 
                    src={album.coverPhotoURL} 
                    alt={album.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-charcoal/60 via-transparent to-transparent" />
                  
                  <div className="absolute bottom-8 left-8 right-8 text-white">
                    <h4 className="text-2xl font-serif leading-tight mb-2">{album.title}</h4>
                    <p className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-80">
                      {format(new Date(album.eventDate), 'MMM d, yyyy')} • {album.photoCount} Moments
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Tabs */}
      <nav className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[85%] h-20 bg-brand-charcoal rounded-[2.5rem] shadow-2xl flex items-center justify-around px-8 z-30">
        <button onClick={() => onNavigate('home')} className="p-2 text-brand-peach">
          <Home className="w-6 h-6" />
        </button>
        <button onClick={onCreateAlbum} className="w-12 h-12 bg-white flex items-center justify-center rounded-2xl shadow-lg ring-4 ring-white/10 active:scale-95 transition-all">
          <Plus className="w-7 h-7 text-brand-charcoal" />
        </button>
        <button onClick={() => onNavigate('profile')} className="p-2 text-white/40">
          <UserIcon className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
}
