'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { RotateCcw, Trash2 } from 'lucide-react';
import { photosApi } from '@/lib/api/endpoints';
import { resolveAssetUrl } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import { ConfirmDialog, PageHeader, Spinner } from '@/components/ui';
import AppShell from '@/components/AppShell';
import type { Photo } from '@/lib/types';

const GRACE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

function daysLeft(deletedAt?: string): number {
  if (!deletedAt) return GRACE_DAYS;
  const elapsed = Date.now() - new Date(deletedAt).getTime();
  if (Number.isNaN(elapsed)) return GRACE_DAYS;
  return Math.max(0, Math.ceil((GRACE_DAYS * DAY_MS - elapsed) / DAY_MS));
}

export default function TrashPage() {
  const { albumId = '' } = useParams<{ albumId: string }>();
  const { user, albums } = useAuth();
  const albumOwnerId = albums.find((a) => a.id === albumId)?.ownerId;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoreTarget, setRestoreTarget] = useState<Photo | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setPhotos(await photosApi.list(albumId, { deleted: true }));
    } catch (error) {
      console.warn('Failed to load recently deleted photos:', error);
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    void load();
  }, [load]);

  const restore = async () => {
    if (!restoreTarget) return;
    setBusy(true);
    try {
      await photosApi.restore(restoreTarget.id);
      setPhotos((prev) => prev.filter((p) => p.id !== restoreTarget.id));
      setRestoreTarget(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not restore photo.');
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="min-h-dvh bg-cream">
        <PageHeader title="Recently deleted" backHref={`/album/${albumId}`} />

        <main className="px-6 pb-16">
          <p className="mb-5 text-xs text-charcoal/50">Kept for 7 days, then permanently removed.</p>

          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center pb-16 pt-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-beige">
                <Trash2 size={26} color="#E89E82" />
              </div>
              <p className="font-display mt-4 text-[18px] font-bold italic text-charcoal">
                No photos in the trash
              </p>
              <p className="mt-2 max-w-[260px] text-center text-[13px] leading-5 text-charcoal/50">
                Deleted photos appear here for 7 days so they can be brought back.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap justify-between">
              {photos.map((photo, pIndex) => {
                const left = daysLeft(photo.deletedAt);
                const isOwner = !!user && user.userId === photo.uploaderId;
                return (
                  <div
                    key={photo.id}
                    className={`relative mb-4 w-[48%] overflow-hidden rounded-2xl bg-[#EDE9E1] shadow-[0_5px_10px_rgba(0,0,0,0.12)] ${pIndex % 3 === 0 ? 'h-[240px]' : 'h-[180px]'}`}
                  >
                    <Link
                      href={`/album/${albumId}/viewer?index=${pIndex}&trash=1&ownerId=${albumOwnerId ?? ''}`}
                      className="block h-full w-full"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveAssetUrl(photo.url)}
                        alt="Deleted"
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <span className="absolute inset-0 bg-charcoal/45" />
                    </Link>
                    <span className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-1">
                      <Trash2 size={10} color="#FDFBF7" />
                      <span className="text-[9px] font-bold tracking-[1.5px] text-white">
                        {`TRASH · ${left >= 1 ? `${left}d` : '<1d'} left`}
                      </span>
                    </span>
                    {isOwner && (
                      <button
                        onClick={() => setRestoreTarget(photo)}
                        className="absolute inset-x-0 bottom-0 flex h-9 items-center justify-center gap-1.5 bg-peach"
                      >
                        <RotateCcw size={13} color="#2D2D2D" />
                        <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-charcoal">
                          Restore
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <ConfirmDialog
          open={restoreTarget !== null}
          title="Restore this photo?"
          body="It will reappear in the album for everyone."
          confirmLabel="Restore"
          busy={busy}
          onConfirm={() => void restore()}
          onClose={() => setRestoreTarget(null)}
        />
      </div>
    </AppShell>
  );
}
