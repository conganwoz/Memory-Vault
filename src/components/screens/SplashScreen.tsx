import React from 'react';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-brand-charcoal overflow-hidden"
    >
      <motion.div
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 0.6, scale: 1 }}
        transition={{ duration: 4, ease: "easeOut" }}
        className="absolute inset-0 h-full w-full object-cover"
      >
        <img 
          src="https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&q=80&w=1200" 
          alt="Emotional moment"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </motion.div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-brand-charcoal via-transparent to-transparent opacity-80" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="relative z-10 flex flex-col items-center text-center px-10"
      >
        <div className="w-14 h-14 bg-brand-peach rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
          <span className="text-white font-serif text-3xl italic">K</span>
        </div>
        <h1 className="text-4xl font-serif italic text-brand-cream mb-2 tracking-tight">Kindred</h1>
        <p className="text-brand-cream/40 font-medium tracking-[0.3em] uppercase text-[10px]">Shared Memory Vault</p>
      </motion.div>
    </motion.div>
  );
}
