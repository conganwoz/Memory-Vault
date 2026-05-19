import React from 'react';
import { motion } from 'motion/react';
import { Camera, ImagePlus } from 'lucide-react';

interface EmptyStateProps {
  onAdd: () => void;
}

export default function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-8">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-32 h-32 bg-brand-peach/20 rounded-full flex items-center justify-center mb-8"
      >
        <ImagePlus className="w-12 h-12 text-brand-peach" />
      </motion.div>
      
      <h3 className="text-xl font-serif text-brand-charcoal mb-4 italic">
        "Every memory starts with a single photo."
      </h3>
      
      <p className="text-brand-muted text-sm leading-relaxed mb-10 max-w-xs mx-auto">
        This story is just beginning. Invite your friends and family to help fill these pages with moments that matter.
      </p>

      <button
        onClick={onAdd}
        className="px-8 py-4 bg-brand-charcoal text-white rounded-full font-bold shadow-lg flex items-center gap-2 hover:bg-brand-charcoal/90 transition-all"
      >
        <Camera className="w-5 h-5" />
        Add your first memory
      </button>
    </div>
  );
}
