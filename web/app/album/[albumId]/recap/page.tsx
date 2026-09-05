'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Play, Sparkles } from 'lucide-react';
import { recapsApi } from '@/lib/api/endpoints';
import { resolveAssetUrl } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import AppShell from '@/components/AppShell';
import type { Recap } from '@/lib/types';

/** Deterministic pseudo-random in [0,1). */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 999 + 1) * 10000;
  return x - Math.floor(x);
}

function buildLocalRecap(
  albumTitle: string,
  photoCount: number,
  memberCount: number
): Pick<Recap, 'title' | 'summary'> {
  const titles = ['A Journey Through Time', 'Echoes of Laughter', 'Moments That Stayed', 'The Story of Us'];
  const title = titles[Math.floor(seededRandom(albumTitle.length) * titles.length)];
  const summary =
    `From the first frame to the last, "${albumTitle}" holds ${photoCount} ` +
    `shared moment${photoCount === 1 ? '' : 's'} created by ${memberCount} loved one${
      memberCount === 1 ? '' : 's'
    }. Every laugh, every quiet glance — beautifully preserved in this family vault.`;
  return { title, summary };
}

export default function RecapPage() {
  const { albumId = '' } = useParams<{ albumId: string }>();
  const { albums } = useAuth();
  const album = albums.find((a) => a.id === albumId);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [recap, setRecap] = useState<Pick<Recap, 'title' | 'summary'> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fallback = buildLocalRecap(
      album?.title ?? 'Our Vault',
      album?.photoCount ?? 0,
      album?.members.length ?? 1
    );

    const generate = async () => {
      try {
        const generated = await recapsApi.generate(albumId, [
          'ceremony',
          'sunset hike',
          'laughter',
          'dance floor',
        ]);
        if (!cancelled) setRecap(generated);
      } catch (error) {
        console.warn('Recap generation failed, using local fallback:', error);
        if (!cancelled) setRecap(fallback);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    generate();
    return () => {
      cancelled = true;
    };
  }, [albumId, album]);

  const particles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        left: `${seededRandom(i * 3 + 1) * 100}%`,
        size: 3 + seededRandom(i * 7 + 2) * 3,
        duration: 4 + seededRandom(i * 11 + 3) * 4,
        delay: seededRandom(i * 13 + 4) * 5,
      })),
    []
  );

  const shareRecap = async () => {
    if (!recap || !album) return;
    const text = `${recap.title}\n\n"${recap.summary}"\n\n— Kindred · ${album.title}`;
    try {
      await navigator.share?.({ title: recap.title, text });
      if (!navigator.share) {
        await navigator.clipboard.writeText(text);
        alert('Recap saved — copied to your clipboard.');
      }
    } catch {
      // User cancelled.
    }
  };

  const saveRecap = async () => {
    if (!recap) return;
    await navigator.clipboard.writeText(`${recap.title}\n\n${recap.summary}`);
    alert('Recap saved — copied to your clipboard.');
  };

  return (
    <AppShell>
      <div className="fixed inset-0 flex flex-col bg-charcoal">
        {/* Header */}
        <div className="absolute inset-x-0 top-0 z-[5] flex items-center justify-between px-6 pb-2 pt-6">
          <button className="glass" onClick={() => router.back()}>
            <ChevronLeft size={24} />
          </button>
          <span className="text-[10px] font-bold uppercase tracking-[3px] text-peach">
            Memories Refined
          </span>
          <span className="w-10" />
        </div>

        {/* Ambient particles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {particles.map((p, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-peach"
              style={{
                left: p.left,
                bottom: -10,
                width: p.size,
                height: p.size,
                animation: `float-up ${p.duration}s ease-out ${p.delay}s infinite`,
                opacity: 0,
              }}
            />
          ))}
        </div>

        {!loading && recap ? (
          <div className="flex flex-1 flex-col items-center justify-center px-9 pb-10">
            {/* Recap card */}
            <div className="relative mb-8 aspect-[3/4] w-full max-w-[340px] overflow-hidden rounded-[48px] shadow-[0_16px_30px_rgba(0,0,0,0.5)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveAssetUrl(album?.coverPhotoURL)}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span className="absolute inset-0 bg-gradient-to-b from-charcoal/25 to-charcoal/75" />
              <div className="relative flex h-full flex-col items-center justify-center p-8">
                <span className="mb-7 flex h-20 w-20 items-center justify-center rounded-full bg-white pr-1 shadow-[0_10px_18px_rgba(0,0,0,0.35)]">
                  <Play size={30} color="#2D2D2D" fill="#2D2D2D" />
                </span>
                <h2 className="font-display text-center text-2xl font-semibold italic leading-[31px] text-white">
                  {recap.title}
                </h2>
              </div>
            </div>

            <p className="font-display mb-10 max-w-md text-center text-[17px] italic leading-[27px] text-beige/85">
              &ldquo;{recap.summary}&rdquo;
            </p>

            <div className="flex w-full max-w-[340px] items-center gap-3.5">
              <button
                className="btn btn-white flex-1 !tracking-[1px]"
                onClick={() => void saveRecap()}
              >
                Save Recap
              </button>
              <button
                onClick={() => void shareRecap()}
                className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white"
                aria-label="Share recap"
              >
                <ShareIcon size={20} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="relative mb-7 flex h-24 w-24 items-center justify-center">
              <span
                className="absolute inset-0 animate-spin rounded-full border-2 border-transparent"
                style={{
                  borderTopColor: '#E89E82',
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderBottomColor: 'transparent',
                  animationDuration: '2.6s',
                }}
              />
              <Sparkles size={30} color="#E89E82" fill="#E89E82" />
            </div>
            <h2 className="font-display mb-2 text-xl font-semibold italic text-beige">
              Weaving your story...
            </h2>
            <p className="text-[10px] uppercase tracking-[3px] text-white/40">
              Kindred AI is working
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ShareIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
      <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
    </svg>
  );
}
