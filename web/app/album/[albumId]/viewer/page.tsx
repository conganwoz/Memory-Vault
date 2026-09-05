'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  MoreHorizontal,
  RotateCcw,
  Share2,
  Trash2,
} from 'lucide-react';
import { photosApi } from '@/lib/api/endpoints';
import { resolveAssetUrl } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import { Avatar, ConfirmDialog, Modal, Spinner } from '@/components/ui';
import type { Photo } from '@/lib/types';

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export default function PhotoViewerPage() {
  const { albumId = '' } = useParams<{ albumId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const initialIndex = clamp(Number(search.get('index') ?? 0), 0, Number.MAX_SAFE_INTEGER);
  const isTrash = search.get('trash') === '1';
  const ownerId = search.get('ownerId') ?? undefined;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState<null | 'delete' | 'restore'>(null);
  const [busy, setBusy] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    photosApi
      .list(albumId, { deleted: isTrash })
      .then((list) => {
        if (cancelled) return;
        setPhotos(list);
        setIndex(clamp(initialIndex, 0, Math.max(0, list.length - 1)));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId, isTrash]);

  const photo = photos[index];
  const canModerate = !!user && !!photo && (user.userId === photo.uploaderId || user.userId === ownerId);

  useEffect(() => {
    setLiked(false);
  }, [photo?.id]);

  const goTo = useCallback(
    (i: number) => {
      const next = clamp(i, 0, photos.length - 1);
      setIndex(next);
      const el = railRef.current;
      if (el) el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    },
    [photos.length]
  );

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goTo(index - 1);
      if (e.key === 'ArrowRight') goTo(index + 1);
      if (e.key === 'Escape') router.back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, index, router]);

  // Sync index from the scroll rail.
  const onRailScroll = useCallback(() => {
    const el = railRef.current;
    if (!el || el.clientWidth === 0) return;
    const next = clamp(Math.round(el.scrollLeft / el.clientWidth), 0, photos.length - 1);
    if (next !== index) setIndex(next);
  }, [index, photos.length]);

  const toggleLike = async () => {
    if (!photo) return;
    const newLiked = !liked;
    setLiked(newLiked);
    try {
      await photosApi.react(photo.id, newLiked ? 1 : -1);
    } catch (error) {
      console.warn('Failed to update reaction:', error);
      setLiked(!newLiked);
    }
  };

  const sharePhoto = async () => {
    const url = resolveAssetUrl(photo?.url);
    const text = photo?.caption
      ? `"${photo.caption}" — shared in Kindred`
      : 'A shared moment from Kindred';
    try {
      await navigator.share?.({ text, url });
      if (!navigator.share) {
        await navigator.clipboard.writeText(`${text}\n${url ?? ''}`);
        alert('Copied to clipboard.');
      }
    } catch {
      // User cancelled.
    }
  };

  const confirmAction = async () => {
    if (!photo) return;
    setBusy(true);
    try {
      if (confirmOpen === 'delete') await photosApi.remove(photo.id);
      else await photosApi.restore(photo.id);
      setConfirmOpen(null);
      router.back();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Action failed. Please try again.');
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-charcoal">
        <Spinner light />
      </div>
    );
  }

  if (!photo || photos.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-charcoal">
        <button className="glass mb-6" onClick={() => router.back()}>
          <ChevronLeft size={24} />
        </button>
        <p className="font-display text-sm italic text-white/60">No photo to show.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-charcoal">
      {/* Page counter */}
      {photos.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 top-[68px] z-[6] flex justify-center">
          <span className="rounded-full border border-white/20 bg-charcoal/70 px-3.5 py-1.5 text-[11px] font-bold tracking-[2px] text-white">
            {index + 1} / {photos.length}
          </span>
        </div>
      )}

      {/* Top controls */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-7 pb-2 pt-6">
        <button className="glass" onClick={() => router.back()}>
          <ChevronLeft size={24} />
        </button>
        <div className="flex gap-2.5">
          <button className="glass" onClick={() => void sharePhoto()}>
            <Share2 size={18} />
          </button>
          {canModerate && (
            <button
              className="glass"
              onClick={() => setConfirmOpen(isTrash ? 'restore' : 'delete')}
              aria-label={isTrash ? 'Restore photo' : 'Delete photo'}
            >
              {isTrash ? <RotateCcw size={18} color="#E89E82" /> : <Trash2 size={18} />}
            </button>
          )}
          <button className="glass" onClick={() => setMoreOpen(true)}>
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* Paged rail */}
      <div
        ref={railRef}
        onScroll={onRailScroll}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {photos.map((p, i) => (
          <div
            key={p.id}
            className="flex h-full w-full shrink-0 snap-center items-center justify-center p-6"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveAssetUrl(p.url)}
              alt={p.caption ?? 'Shared moment'}
              className="max-h-full max-w-full select-none object-contain"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Pager arrows */}
      {photos.length > 1 && (
        <>
          {index > 0 && (
            <button
              className="glass absolute left-4 top-1/2 z-[8] -translate-y-1/2"
              onClick={() => goTo(index - 1)}
              aria-label="Previous photo"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {index < photos.length - 1 && (
            <button
              className="glass absolute right-4 top-1/2 z-[8] -translate-y-1/2"
              onClick={() => goTo(index + 1)}
              aria-label="Next photo"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </>
      )}

      {/* Trash badge */}
      {isTrash && (
        <div className="pointer-events-none absolute inset-x-0 top-[104px] z-[6] flex justify-center">
          <span className="rounded-full border border-white/20 bg-charcoal/85 px-3.5 py-1.5 text-[10px] font-bold tracking-[2px] text-white">
            IN TRASH — RESTORES FOR 7 DAYS
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent pb-6 pt-10">
        <div className="px-8">
          <div className="mb-5 flex items-center gap-3">
            <Avatar
              uri={`https://api.dicebear.com/7.x/avataaars/svg?seed=${photo.uploaderName}`}
              size={40}
              className="border border-white/25"
            />
            <div>
              <p className="text-sm font-semibold text-white">{photo.uploaderName}</p>
              <p className="text-[10px] tracking-[2px] text-white/50">
                {(photo.timestampLabel || 'Shared moment').toUpperCase()}
              </p>
            </div>
          </div>

          {!!photo.caption && (
            <p className="font-display mb-6 text-[15px] italic leading-[23px] text-beige/90">
              &ldquo;{photo.caption}&rdquo;
            </p>
          )}

          <div className="flex items-center gap-5">
            <button onClick={() => void toggleLike()} className="flex items-center gap-2">
              <Heart
                size={24}
                color={liked ? '#E89E82' : '#FDFBF7'}
                fill={liked ? '#E89E82' : 'transparent'}
              />
              <span className="text-xs font-bold text-white">
                {(photo.reactions?.heart ?? 0) + (liked ? 1 : 0)}
              </span>
            </button>

            <span className="flex items-center gap-2">
              <MessageCircle size={24} color="#FDFBF7" />
              <span className="text-xs font-bold text-white">0</span>
            </span>

            <span className="flex-1" />

            {isTrash && canModerate ? (
              <button
                className="flex items-center gap-2 rounded-full bg-peach px-[22px] py-3"
                onClick={() => setConfirmOpen('restore')}
              >
                <RotateCcw size={16} color="#2D2D2D" />
                <span className="text-[11px] font-bold uppercase tracking-[2px] text-charcoal">
                  Restore
                </span>
              </button>
            ) : (
              <button
                className="rounded-full bg-white px-[22px] py-3 text-[11px] font-bold uppercase tracking-[2px] text-charcoal"
                onClick={() => void sharePhoto()}
              >
                Share
              </button>
            )}
          </div>
        </div>
      </div>

      {/* More menu */}
      <Modal open={moreOpen} onClose={() => setMoreOpen(false)}>
        <div className="flex flex-col gap-2">
          <button
            className="rounded-2xl px-5 py-3.5 text-left text-sm font-semibold text-charcoal hover:bg-beige"
            onClick={() => {
              setMoreOpen(false);
              void sharePhoto();
            }}
          >
            Share photo
          </button>
          {canModerate && (
            <button
              className="rounded-2xl px-5 py-3.5 text-left text-sm font-semibold text-danger hover:bg-red-50"
              onClick={() => {
                setMoreOpen(false);
                setConfirmOpen(isTrash ? 'restore' : 'delete');
              }}
            >
              {isTrash ? 'Restore photo' : 'Delete photo'}
            </button>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen !== null}
        title={confirmOpen === 'delete' ? 'Delete this photo?' : 'Restore this photo?'}
        body={
          confirmOpen === 'delete'
            ? 'It moves to the album trash and is permanently removed after 7 days. You can restore it anytime before then.'
            : 'It will reappear in the album for everyone.'
        }
        confirmLabel={confirmOpen === 'delete' ? 'Delete' : 'Restore'}
        destructive={confirmOpen === 'delete'}
        busy={busy}
        onConfirm={() => void confirmAction()}
        onClose={() => setConfirmOpen(null)}
      />
    </div>
  );
}
