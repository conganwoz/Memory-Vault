import React from 'react';
import { motion } from 'motion/react';
import { 
  Settings, 
  ChevronRight, 
  LogOut, 
  Shield, 
  Bell, 
  User as UserIcon, 
  Moon, 
  HelpCircle,
  Plus,
  Users,
  Image as ImageIcon,
  Calendar,
  Layers,
  Sparkles,
  Bookmark,
  Home
} from 'lucide-react';
import { User, Album } from '../../types';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

interface ProfileScreenProps {
  user: User;
  albums: Album[];
  onSignOut: () => void;
  onNavigate: (screen: string) => void;
  onCreateAlbum: () => void;
}

export default function ProfileScreen({ user, albums, onSignOut, onNavigate, onCreateAlbum }: ProfileScreenProps) {
  // Mock recent memories for the "polaroid" section
  const recentMemories = [
    { title: 'Lan & Minh Wedding', date: 'Oct 12, 2024', image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=400', contributors: 12 },
    { title: 'Da Lat Escape', date: 'Jan 05, 2026', image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&q=80&w=400', contributors: 8 },
    { title: 'Family Reunion', date: 'Dec 24, 2025', image: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=400', contributors: 15 },
  ];

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="flex flex-col h-full bg-brand-cream relative overflow-y-auto">
      {/* Background Blobs for Atmosphere */}
      <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-brand-glow opacity-20 rounded-full blur-[60px] pointer-events-none" />
      <div className="absolute top-1/2 left-[-100px] w-80 h-80 bg-brand-beige opacity-40 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
      <header className="p-8 pb-4 flex justify-between items-center z-10 relative">
        <h2 className="text-xl font-serif italic text-brand-charcoal">My Memory Vault</h2>
        <button className="p-2.5 bg-white rounded-xl shadow-sm border border-brand-charcoal/5 active:scale-95 transition-all">
          <Settings className="w-5 h-5 text-brand-charcoal" />
        </button>
      </header>

      <main className="flex-1 px-8 py-6 space-y-12 relative z-10 mb-32">
        {/* Profile Card */}
        <section className="flex flex-col items-center text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative mb-6"
          >
            <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden shadow-2xl ring-8 ring-white/50 bg-white">
              <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-brand-peach rounded-2xl flex items-center justify-center text-white border-4 border-white shadow-lg">
              <Sparkles className="w-4 h-4 fill-white" />
            </div>
          </motion.div>
          
          <h1 className="text-3xl font-serif text-brand-charcoal mb-2">{user.displayName}</h1>
          <p className="text-[10px] uppercase tracking-[0.25em] text-brand-muted font-bold">
            Preserving frames since {format(new Date(user.createdAt), 'yyyy')}
          </p>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 gap-4">
          {[
            { label: 'Albums Joined', value: albums.length, icon: Layers, color: 'bg-brand-peach/10 text-brand-peach' },
            { label: 'Moments Shared', value: '428', icon: ImageIcon, color: 'bg-brand-charcoal/5 text-brand-charcoal' },
            { label: 'Loved Ones', value: '37', icon: Users, color: 'bg-brand-charcoal/5 text-brand-charcoal' },
            { label: 'Years Captured', value: '2', icon: Calendar, color: 'bg-brand-charcoal/5 text-brand-charcoal' },
          ].map((stat, i) => (
            <motion.div 
              key={stat.label}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-5 rounded-[2rem] border border-brand-charcoal/5 shadow-sm space-y-3"
            >
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-serif text-brand-charcoal">{stat.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 gap-4">
          <button 
            onClick={onCreateAlbum}
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-[2rem] border border-brand-charcoal/5 shadow-sm active:scale-95 transition-all group"
          >
            <div className="w-12 h-12 bg-brand-charcoal text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">New Vault</span>
          </button>
          <button 
            onClick={() => onNavigate('recap')}
            className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-[2rem] border border-brand-charcoal/5 shadow-sm active:scale-95 transition-all group"
          >
            <div className="w-12 h-12 bg-brand-beige text-brand-charcoal rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Recaps</span>
          </button>
        </section>

        {/* Recently Revisited (Horizontal Scroll) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-muted">Recently Revisited</h3>
            <button className="text-[10px] font-bold text-brand-peach uppercase tracking-widest hover:underline">View All</button>
          </div>
          
          <div className="flex gap-6 overflow-x-auto pb-4 -mx-8 px-8 no-scrollbar">
            {recentMemories.map((memory, i) => (
              <motion.div 
                key={memory.title}
                whileHover={{ y: -5 }}
                className="flex-shrink-0 w-64 bg-white p-4 rounded-3xl shadow-xl border border-brand-charcoal/5 active:scale-95 transition-all"
              >
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4">
                  <img src={memory.image} alt={memory.title} className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/30">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">{memory.contributors} contributors</span>
                  </div>
                </div>
                <h4 className="text-lg font-serif text-brand-charcoal mb-1">{memory.title}</h4>
                <p className="text-[10px] text-brand-muted uppercase tracking-widest font-bold italic">{memory.date}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* On This Day Section */}
        <section className="relative rounded-[3rem] overflow-hidden bg-brand-charcoal p-10 group cursor-pointer shadow-2xl">
           <img 
            src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800" 
            alt="On this day" 
            className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-[2s]"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-brand-charcoal via-brand-charcoal/20 to-transparent" />
           
           <div className="relative z-10 flex flex-col items-center text-center">
              <div className="px-4 py-1.5 bg-brand-peach/20 backdrop-blur-md rounded-xl border border-brand-peach/30 mb-6">
                <span className="text-[10px] font-bold text-brand-peach uppercase tracking-[0.2em]">On This Day</span>
              </div>
              <h4 className="text-3xl font-serif text-white italic mb-4">A Year in Bloom</h4>
              <p className="text-white/60 text-xs leading-relaxed max-w-[240px]">
                One year ago, 24 people shared their favorite memories from the Spring Festival.
              </p>
              
              <div className="flex -space-x-3 mt-8">
                 {[1, 2, 3, 4, 5].map((_, i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-brand-charcoal overflow-hidden transform group-hover:translate-x-1 transition-transform">
                       <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + i * 5}`} alt="Member" />
                    </div>
                 ))}
              </div>
           </div>
        </section>

        {/* Settings Group */}
        <section className="space-y-6">
           <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-muted ml-1">Settings & Privacy</h4>
           <div className="bg-white rounded-[2.5rem] border border-brand-charcoal/5 shadow-sm overflow-hidden">
              {[
                { label: 'Privacy & Security', icon: Shield },
                { label: 'Notifications', icon: Bell },
                { label: 'Personal Archive', icon: Bookmark },
                { label: 'Appearance', icon: Moon },
                { label: 'Help & Support', icon: HelpCircle },
              ].map((item, i) => (
                <button 
                  key={item.label}
                  onClick={item.label === 'Appearance' ? toggleDarkMode : undefined}
                  className={cn(
                    "w-full flex items-center justify-between p-6 transition-colors hover:bg-brand-beige/30",
                    i !== 4 && "border-b border-brand-charcoal/5"
                  )}
                >
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-brand-beige rounded-2xl flex items-center justify-center text-brand-charcoal">
                        <item.icon className="w-5 h-5" />
                     </div>
                     <span className="text-sm font-semibold text-brand-charcoal">{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-brand-muted" />
                </button>
              ))}
           </div>
           
           <button 
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-3 p-6 bg-red-50 text-red-500 rounded-[2rem] font-bold tracking-widest uppercase text-[10px] active:scale-95 transition-all shadow-sm"
           >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Kindred</span>
           </button>
        </section>
      </main>

      {/* Persistent Bottom Nav (Local for Profile) */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[85%] h-20 bg-brand-charcoal rounded-[2.5rem] shadow-2xl flex items-center justify-around px-8 z-30">
        <button onClick={() => onNavigate('home')} className="p-2 text-white/40">
           <Home className="w-6 h-6" />
        </button>
        <button onClick={onCreateAlbum} className="w-12 h-12 bg-white flex items-center justify-center rounded-2xl shadow-lg ring-4 ring-white/10 active:scale-95 transition-all">
          <Plus className="w-7 h-7 text-brand-charcoal" />
        </button>
        <button className="p-2 text-brand-peach">
           <UserIcon className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
}
