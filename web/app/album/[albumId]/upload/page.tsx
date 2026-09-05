'use client';

import { useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sparkles, Upload as UploadIcon, X } from 'lucide-react';
import { photosApi } from '@/lib/api/endpoints';
import { mapWithConcurrency } from '@/lib/api/client';
import { PageHeader } from '@/components/ui';
import AppShell from '@/components/AppShell';
import type { MomentLabel } from '@/lib/types';

const MOMENT_LABELS: MomentLabel[] = ['Morning', 'Ceremony', 'Afternoon', 'Dinner', 'Party', 'Late Night'];
const MAX_CONCURRENT_UPLOADS = 3;
const MAX_SELECTION = 10;

interface PickedItem {
  id: string;
  file: File;
  url: string;
}

export default function UploadPage() {
  const { albumId = '' } = useParams<{ albumId: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<PickedItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const pickPhotos = (files: FileList | null) => {
    if (!files) return;
    const picked: PickedItem[] = Array.from(files)
      .slice(0, MAX_SELECTION)
      .map((file, i) => ({
        id: `${file.name}-${file.lastModified}-${i}-${Date.now()}`,
        file,
        url: URL.createObjectURL(file),
      }));
    setItems((prev) => [...prev, ...picked].slice(0, MAX_SELECTION));
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      const removed = prev.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return next;
    });
  };

  const clearAll = () => {
    items.forEach((item) => URL.revokeObjectURL(item.url));
    setItems([]);
  };

  const handleUpload = async () => {
    if (items.length === 0 || uploading) return;
    setUploading(true);
    setProgress(0);

    const total = items.length;
    let completed = 0;
    let failed = 0;

    await mapWithConcurrency(items, MAX_CONCURRENT_UPLOADS, async (item) => {
      try {
        await photosApi.uploadFile(albumId, item.file, {
          timestampLabel: MOMENT_LABELS[Math.floor(Math.random() * MOMENT_LABELS.length)],
        });
      } catch (error) {
        console.warn('Upload failed for one photo:', error);
        failed++;
      } finally {
        completed++;
        setProgress(Math.round((completed / total) * 100));
      }
    });

    clearAll();
    if (failed > 0) {
      alert(`${failed} of ${total} photos could not be uploaded. The rest were saved.`);
      setUploading(false);
    } else {
      setTimeout(() => router.back(), 400);
    }
  };

  return (
    <AppShell>
      <div className="flex min-h-dvh flex-col bg-cream">
        <PageHeader title="Add Memories" backHref={`/album/${albumId}`} />

        {!uploading ? (
          <>
            <main className="flex-1 px-8 pb-8">
              {/* Drop-zone */}
              <button
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center rounded-[48px] border-2 border-dashed border-charcoal/10 bg-white px-6 py-11"
              >
                <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-beige">
                  <UploadIcon size={30} color="#2D2D2D" />
                </span>
                <span className="mb-1.5 text-[15px] font-semibold text-charcoal">
                  Tap to pick photos
                </span>
                <span className="text-xs text-muted">High quality photos preferred</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  pickPhotos(e.target.files);
                  e.target.value = '';
                }}
              />

              {items.length > 0 && (
                <div className="mt-7">
                  <div className="mb-3.5 flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold uppercase tracking-[2px] text-muted">
                      Selected ({items.length})
                    </span>
                    <button
                      onClick={clearAll}
                      className="text-xs font-bold text-danger"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="relative aspect-square w-[31%] overflow-hidden rounded-2xl bg-[#EDE9E1]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.url}
                          alt="Selected"
                          className="h-full w-full object-cover"
                        />
                        <button
                          onClick={() => removeItem(item.id)}
                          className="absolute right-1.5 top-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-black/45"
                          aria-label="Remove"
                        >
                          <X size={12} color="#FDFBF7" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </main>

            <footer className="px-8 pb-9 pt-3">
              <button
                className="btn btn-dark w-full rounded-full !py-4"
                onClick={() => void handleUpload()}
                disabled={items.length === 0}
              >
                <Sparkles size={18} color="#E89E82" fill="#E89E82" />
                Upload {items.length} {items.length === 1 ? 'Moment' : 'Moments'}
              </button>
            </footer>
          </>
        ) : (
          /* Uploading state */
          <div className="flex flex-1 flex-col items-center justify-center px-10">
            <div className="relative mb-9 h-32 w-32">
              <svg width="128" height="128" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="56" stroke="rgba(45,45,45,0.07)" strokeWidth="8" fill="none" />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#E89E82"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 56}
                  strokeDashoffset={2 * Math.PI * 56 * (1 - progress / 100)}
                  transform="rotate(-90 64 64)"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-[26px] font-semibold italic text-charcoal">
                  {progress}%
                </span>
              </span>
            </div>
            <h2 className="font-display mb-4 text-center text-[21px] font-semibold italic text-charcoal">
              Preserving your moments...
            </h2>
            <Sparkles size={16} color="#E89E82" fill="#E89E82" />
            <p className="mt-3.5 max-w-[280px] text-center text-[13px] leading-[21px] text-muted">
              Sending these special memories to the shared book. This will just take a second.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
