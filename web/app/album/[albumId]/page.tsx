'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Heart, MoreVertical, Plus, Share2, Sparkles, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { albumsApi, photosApi, uploadsApi } from '@/lib/api/endpoints';
import { detectImageTone } from '@/lib/imageTone';
import { resolveAssetUrl } from '@/lib/config';
import { Avatar, Modal, Spinner } from '@/components/ui';
import AppShell from '@/components/AppShell';
import type { Album, Photo } from '@/lib/types';

const HEADER_HEIGHT = 460;

export default function AlbumDetailPage() {
  const { albumId = '' } = useParams<{ albumId: string }>();
  const { user, albums, refreshAlbums } = useAuth();
  const album = albums.find((a) => a.id === albumId);
  const router = useRouter();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [deletedPhotos, setDeletedPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroY, setHeroY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadPhotos = useCallback(async () => {
    try {
      const [list, deleted] = await Promise.all([
        photosApi.list(albumId),
        photosApi.list(albumId, { deleted: true }),
      ]);
      setPhotos(list);
      setDeletedPhotos(deleted);
    } catch (error) {
      console.warn('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  // Collapsing hero: translate up + fade as the page scrolls.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        setHeroY(Math.min(HEADER_HEIGHT, el.scrollTop));
        raf = 0;
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const changeCover = async (file: File | undefined) => {
    if (!file || !album) return;
    try {
      const url = await uploadsApi.uploadFile(file);
      const coverTone = await detectImageTone(file);
      await albumsApi.update(album.id, { coverPhotoURL: url, coverTone });
      await refreshAlbums();
      alert('Cover updated — your new cover photo is live.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not update cover.');
    }
  };

  // Group photos by timestampLabel.
  const sections = useMemo(() => {
    const grouped: Record<string, Photo[]> = {};
    for (const photo of photos) {
      const label = photo.timestampLabel || 'Moments';
      (grouped[label] ??= []).push(photo);
    }
    return Object.entries(grouped);
  }, [photos]);

  if (!album) {
    return (
      <AppShell>
        <div className="flex min-h-dvh flex-col items-center justify-center bg-cream">
          <p className="font-display mb-3 text-[22px] italic text-charcoal">Vault not found</p>
          <Link href="/home" className="font-bold text-peach">
            Go back
          </Link>
        </div>
      </AppShell>
    );
  }

  const isDarkCover = album.coverTone !== 'light';
  const heroOpacity = Math.max(0, 1 - heroY / (HEADER_HEIGHT * 0.55));

  return (
    <AppShell>
      <div className="relative min-h-dvh bg-cream">
        {/* Scroll container */}
        <div ref={scrollRef} className="h-dvh overflow-y-auto">
          <main className="relative">
            {/* Collapsing hero */}
            <div
              className="pointer-events-none absolute left-0 right-0 top-0 z-[1] overflow-hidden"
              style={{ height: HEADER_HEIGHT }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  transform: `translateY(-${heroY}px)`,
                  opacity: heroOpacity,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveAssetUrl(album.coverPhotoURL)}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <span
                  className="absolute inset-0"
                  style={{
                    background:
                      isDarkCover
                        ? 'linear-gradient(to bottom, rgba(253,251,247,0) 0%, rgba(45,45,45,0.4) 55%, rgba(45,45,45,0.8) 100%)'
                        : 'linear-gradient(to bottom, rgba(253,251,247,1) 0%, rgba(45,45,45,0.25) 55%, rgba(45,45,45,0) 100%)',
                  }}
                />

                {/* Top controls */}
                <div className="pointer-events-auto absolute inset-x-0 top-0 flex items-center justify-between px-6 pb-2 pt-6">
                  <button className="glass" onClick={() => router.back()}>
                    <ChevronLeft size={24} />
                  </button>
                  <div className="flex gap-2">
                    <Link href={`/album/${albumId}/invite`} className="glass">
                      <Share2 size={20} />
                    </Link>
                    <button className="glass" onClick={() => setMenuOpen(true)}>
                      <MoreVertical size={20} />
                    </button>
                  </div>
                </div>

                {/* Hero info */}
                <div className="pointer-events-none absolute inset-x-8 bottom-11">
                  <h1
                    className="font-display mb-1.5 text-[40px] font-semibold italic leading-[46px] tracking-tight"
                    style={{
                      color: isDarkCover ? '#FDFBF7' : '#2D2D2D',
                      textShadow: isDarkCover ? '0 1px 8px rgba(0,0,0,0.45)' : 'none',
                    }}
                  >
                    {album.title}
                  </h1>
                  <p
                    className="font-display mb-7 text-[13px] italic font-medium"
                    style={{ color: isDarkCover ? 'rgba(255,255,255,0.8)' : 'rgba(45,45,45,0.6)' }}
                  >
                    {format(new Date(album.eventDate), 'MMMM d, yyyy')}
                  </p>

                  <div className="pointer-events-auto flex items-center justify-between">
                    <div className="flex items-center">
                      {album.members.slice(0, 5).map((member, i) => (
                        <span key={`${member}-${i}`} style={{ marginLeft: i === 0 ? 0 : -12 }}>
                          <Avatar
                            uri={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member}`}
                            size={40}
                            className="border-[2px] border-cream"
                          />
                        </span>
                      ))}
                      {album.members.length > 5 && (
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-cream bg-beige text-[10px] font-bold text-charcoal"
                          style={{ marginLeft: -12 }}
                        >
                          +{album.members.length - 5}
                        </span>
                      )}
                      <Link
                        href={`/album/${albumId}/invite`}
                        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-cream bg-peach"
                        style={{ marginLeft: -12 }}
                        aria-label="Invite loved ones"
                      >
                        <Plus size={20} color="#FDFBF7" />
                      </Link>
                    </div>

                    <Link
                      href={`/album/${albumId}/recap`}
                      className="flex items-center gap-2 rounded-2xl bg-charcoal px-[22px] py-[13px] shadow-[0_8px_14px_rgba(0,0,0,0.3)]"
                    >
                      <Sparkles size={16} color="#E89E82" fill="#E89E82" />
                      <span className="text-[10px] font-bold uppercase tracking-[2px] text-white">
                        Memory Recap
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline content */}
            <div className="px-6 pb-40" style={{ paddingTop: HEADER_HEIGHT }}>
              <div className="mx-auto mb-7 h-[5px] w-12 rounded-full bg-charcoal/10" />

              {loading ? (
                <div className="flex justify-center py-10">
                  <Spinner />
                </div>
              ) : photos.length === 0 ? (
                <div className="flex flex-col items-center py-[72px]">
                  <p className="font-display max-w-xs text-center text-[15px] italic leading-6 text-charcoal/40">
                    Every memory starts with a single photo. Upload yours below.
                  </p>
                </div>
              ) : (
                sections.map(([label, sectionPhotos]) => (
                  <section key={label} className="mb-14">
                    <div className="mb-7 flex justify-center">
                      <span className="rounded-full border border-charcoal/5 bg-beige px-4 py-1.5">
                        <span className="caption">{label}</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap justify-between">
                      {sectionPhotos.map((photo, i) => {
                        const pIndex = i;
                        const tall = pIndex % 3 === 0;
                        const offsetDown = pIndex % 4 === 1;
                        return (
                          <Link
                            key={photo.id}
                            href={`/album/${albumId}/viewer?index=${photos.indexOf(photo)}&ownerId=${album.ownerId}`}
                            className={`relative mb-4 w-[48%] overflow-hidden rounded-2xl bg-[#EDE9E1] shadow-[0_5px_10px_rgba(0,0,0,0.12)] ${tall ? 'h-[240px]' : 'h-[180px]'} ${offsetDown ? 'mt-7' : ''}`}
                          >
                            <Image
                              src={resolveAssetUrl(photo.url)!}
                              alt={photo.caption ?? 'Shared moment'}
                              fill
                              sizes="(max-width: 640px) 48vw, 320px"
                              className="object-cover"
                              loading="lazy"
                            />
                            {(photo.reactions?.heart ?? 0) > 0 && (
                              <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-black/35 px-2 py-1">
                                <Heart size={10} color="#FDFBF7" fill="#FDFBF7" />
                                <span className="text-[10px] font-bold text-white">
                                  {photo.reactions.heart}
                                </span>
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </div>
          </main>
        </div>

        {/* Floating actions — upload only (no camera on web) */}
        <div className="fixed bottom-9 right-7 z-[5] flex flex-col items-end gap-3.5">
          <Link
            href={`/album/${albumId}/upload`}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-[0_6px_12px_rgba(0,0,0,0.15)]"
            aria-label="Upload photos"
          >
            <Upload size={22} color="#2D2D2D" />
          </Link>
        </div>

        {/* Actions menu */}
        <Modal open={menuOpen} onClose={() => setMenuOpen(false)}>
          <div className="flex flex-col gap-2">
            <MenuRow
              label="Invite loved ones"
              onClick={() => {
                setMenuOpen(false);
                router.push(`/album/${albumId}/invite`);
              }}
            />
            <MenuRow
              label="Memory recap"
              onClick={() => {
                setMenuOpen(false);
                router.push(`/album/${albumId}/recap`);
              }}
            />
            {deletedPhotos.length > 0 && (
              <MenuRow
                label={
                  deletedPhotos.length > 1
                    ? `Recently deleted (${deletedPhotos.length})`
                    : 'Recently deleted'
                }
                onClick={() => {
                  setMenuOpen(false);
                  router.push(`/album/${albumId}/trash`);
                }}
              />
            )}
            {user && album.ownerId === user.userId && (
              <MenuRow
                label="Change cover photo"
                onClick={() => {
                  setMenuOpen(false);
                  coverInputRef.current?.click();
                }}
              />
            )}
          </div>
        </Modal>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void changeCover(e.target.files?.[0])}
        />
      </div>
    </AppShell>
  );
}

function MenuRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl px-5 py-3.5 text-left text-sm font-semibold text-charcoal transition-colors hover:bg-beige"
    >
      {label}
    </button>
  );
}
