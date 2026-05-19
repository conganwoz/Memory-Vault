import React from 'react';
import { motion } from 'motion/react';
import { Chrome } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full bg-brand-cream p-8"
    >
      <div className="flex-1 flex flex-col justify-center items-center text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-12 relative"
        >
          <div className="w-64 h-64 rounded-2xl overflow-hidden shadow-2xl rotate-3">
             <img 
              src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800" 
              alt="Memory"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute -bottom-6 -left-6 w-48 h-48 rounded-2xl overflow-hidden shadow-xl -rotate-6 border-4 border-white">
             <img 
              src="https://images.unsplash.com/photo-1520390138845-fd2d229dd553?auto=format&fit=crop&q=80&w=800" 
              alt="Memory 2"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>

        <motion.div
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.4 }}
        >
          <h2 className="text-4xl font-serif text-brand-charcoal mb-4 italic">Welcome Home</h2>
          <p className="text-brand-muted mb-12 max-w-xs mx-auto leading-relaxed text-sm">
            Invite your loved ones and start building your shared story, one frame at a time.
          </p>
        </motion.div>

        <motion.button
          onClick={onLogin}
          whileTap={{ scale: 0.98 }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-xs flex items-center justify-center gap-3 bg-brand-charcoal text-white py-4 rounded-2xl font-bold tracking-widest uppercase text-xs shadow-xl transition-all"
        >
          <Chrome className="w-4 h-4 text-brand-peach" />
          <span>Continue with Google</span>
        </motion.button>

        <p className="mt-8 text-xs text-brand-muted opacity-60 max-w-xs">
          By continuing, you agree to our terms. We promise to keep your memories private and safe.
        </p>
      </div>
    </motion.div>
  );
}
