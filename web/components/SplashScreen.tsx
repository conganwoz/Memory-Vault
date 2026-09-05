'use client';

import { Sparkles } from 'lucide-react';

export default function SplashScreen({ light = false }: { light?: boolean }) {
  return (
    <div
      className={`flex min-h-dvh flex-col items-center justify-center gap-6 ${light ? 'bg-cream' : 'bg-charcoal'}`}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-peach">
        <Sparkles size={36} color="#FDFBF7" fill="#FDFBF7" />
      </div>
      <div className="text-center">
        <h1
          className={`font-display text-4xl font-semibold italic ${light ? 'text-charcoal' : 'text-beige'}`}
        >
          Kindred
        </h1>
        <p
          className={`mt-2 text-[10px] font-bold uppercase tracking-[3px] ${light ? 'text-muted' : 'text-white/40'}`}
        >
          Shared Memory Vault
        </p>
      </div>
    </div>
  );
}
