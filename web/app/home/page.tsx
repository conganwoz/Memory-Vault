'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Avatar, FloatingNav } from '@/components/ui';
import AlbumCard from '@/components/AlbumCard';
import AppShell from '@/components/AppShell';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 18) return 'Good afternoon,';
  return 'Good evening,';
}

export default function HomePage() {
  const { user, albums, refreshAlbums } = useAuth();
  const router = useRouter();

  // Re-fetch albums on every visit to Home.
  useEffect(() => {
    void refreshAlbums();
  }, [refreshAlbums]);

  return (
    <AppShell>
      <div className="min-h-dvh bg-cream">
        {/* Header */}
        <header className="flex items-center justify-between px-8 pb-4 pt-8">
          <div>
            <p className="text-[22px] font-medium text-charcoal">{greeting()}</p>
            <p className="font-display text-[26px] font-semibold italic text-peach">
              {user?.displayName?.split(' ')[0] ?? 'Friend'}
            </p>
          </div>
          <Link href="/profile" aria-label="Profile" className="rounded-2xl">
            <Avatar uri={user?.photoURL} size={48} />
          </Link>
        </header>

        <main className="px-6 pb-40 pt-6">
          <div className="mb-[18px] flex items-center justify-between px-2">
            <span className="caption">Your Memories</span>
            <Link href="/create-album" aria-label="Create vault" className="p-1">
              <Plus size={20} color="#8C8C8C" />
            </Link>
          </div>

          {albums.length === 0 ? (
            <div className="flex flex-col items-center px-8 py-16 text-center">
              <p className="font-display mb-2.5 text-[22px] italic text-charcoal">No vaults yet</p>
              <p className="max-w-[300px] text-[13px] leading-5 text-muted">
                Tap the + button below to create your first shared memory vault.
              </p>
            </div>
          ) : (
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              {albums.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
          )}
        </main>

        <FloatingNav active="home" onCreate={() => router.push('/create-album')} />
      </div>
    </AppShell>
  );
}
