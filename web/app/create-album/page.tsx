'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, Camera, Check, Globe, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { uploadsApi } from '@/lib/api/endpoints';
import { detectImageTone, type CoverTone } from '@/lib/imageTone';
import { PageHeader, Spinner } from '@/components/ui';
import AppShell from '@/components/AppShell';

const DEFAULT_COVER_URL =
  'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800';

const PRIVACY_OPTIONS = [
  { id: 'invite' as const, label: 'Close Family', desc: 'Only explicitly invited loved ones', Icon: Lock },
  { id: 'link' as const, label: 'Public Link', desc: 'Anyone with the secret link', Icon: Globe },
];

export default function CreateAlbumPage() {
  const { createAlbum } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [privacy, setPrivacy] = useState<'invite' | 'link'>('invite');
  const [cover, setCover] = useState<{ url: string; file: File } | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickCover = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCover({ url, file });
  };

  const handleCreate = async () => {
    if (!title.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      let coverPhotoURL = DEFAULT_COVER_URL;
      let coverTone: CoverTone | undefined;

      if (cover) {
        try {
          coverPhotoURL = await uploadsApi.uploadFile(cover.file);
          coverTone = await detectImageTone(cover.file);
        } catch (err) {
          console.warn('Cover upload failed, using default cover:', err);
        }
      }

      const albumId = await createAlbum({
        title: title.trim(),
        eventDate: date.toISOString(),
        privacy,
        coverPhotoURL,
        coverTone,
      });
      router.push(`/album/${albumId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create vault.');
      setCreating(false);
    }
  };

  return (
    <AppShell>
      <div className="min-h-dvh bg-cream">
        <PageHeader title="New Memory Vault" backHref="/home" />

        <main className="px-8 pb-16">
          {/* Cover picker */}
          <button
            onClick={() => fileRef.current?.click()}
            className="relative mx-auto mb-11 flex h-[256px] w-[192px] items-center justify-center overflow-hidden rounded-[40px] border-2 border-dashed border-charcoal/10 bg-white"
            aria-label="Choose vault cover"
          >
            {cover ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover.url} alt="Cover preview" className="absolute inset-0 h-full w-full object-cover" />
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-charcoal/45 text-white">
                  <Camera size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-[2px]">Change Cover</span>
                </span>
              </>
            ) : (
              <>
                <Camera size={40} color="#8C8C8C" opacity={0.5} />
                <span className="caption mt-3.5">Vault Cover</span>
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickCover(e.target.files?.[0])}
          />

          {/* Title */}
          <div className="mb-9">
            <span className="caption">Vault Title</span>
            <input
              className="input mt-3 font-display !text-[17px] italic"
              placeholder="Summer in Tuscany..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
            />
          </div>

          {/* Date */}
          <div className="mb-9">
            <span className="caption">Memorable Date</span>
            <label className="mt-3 flex cursor-pointer items-center gap-4 rounded-2xl bg-white px-5 py-[18px]">
              <CalendarIcon size={20} color="#8C8C8C" />
              <span className="text-[15px] text-charcoal">
                {format(date, 'MMMM d, yyyy')}
              </span>
              <input
                type="date"
                className="ml-auto h-9 w-9 cursor-pointer opacity-0"
                value={format(date, 'yyyy-MM-dd')}
                onChange={(e) => {
                  if (e.target.value) setDate(new Date(e.target.value));
                }}
                aria-label="Pick date"
              />
            </label>
          </div>

          {/* Privacy */}
          <div className="mb-9">
            <span className="caption">Access Tier</span>
            <div className="mt-3 flex flex-col gap-3.5">
              {PRIVACY_OPTIONS.map((option) => {
                const selected = privacy === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setPrivacy(option.id)}
                    className={`flex items-center gap-4 rounded-3xl border-2 p-5 text-left transition-colors ${
                      selected
                        ? 'border-peach bg-peach/[0.08]'
                        : 'border-transparent bg-white'
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${selected ? 'bg-peach' : 'bg-beige'}`}
                    >
                      <option.Icon size={20} color={selected ? '#FDFBF7' : '#8C8C8C'} />
                    </span>
                    <span className="flex-1">
                      <span className="mb-0.5 block text-sm font-bold text-charcoal">
                        {option.label}
                      </span>
                      <span className="block text-[10px] uppercase tracking-[1px] text-muted">
                        {option.desc}
                      </span>
                    </span>
                    {selected && <Check size={20} color="#E89E82" />}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-center text-[13px] text-danger">
              {error}
            </p>
          )}

          <button
            className="btn btn-dark w-full"
            onClick={() => void handleCreate()}
            disabled={!title.trim() || creating}
          >
            {creating ? <Spinner light /> : 'Initialize Memory Vault'}
          </button>
        </main>
      </div>
    </AppShell>
  );
}
