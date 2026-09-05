'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Calendar,
  ChevronRight,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  LogOut,
  Mail,
  Moon,
  Plus,
  Settings,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { invitationsApi } from '@/lib/api/endpoints';
import { resolveAssetUrl } from '@/lib/config';
import { Avatar, ConfirmDialog, FloatingNav } from '@/components/ui';
import AppShell from '@/components/AppShell';
import type { Invitation } from '@/lib/types';

const ON_THIS_DAY_IMAGE =
  'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800';

export default function ProfilePage() {
  const { user, albums, signOut } = useAuth();
  const router = useRouter();
  const [pendingInvites, setPendingInvites] = useState<Invitation[]>([]);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void refreshInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshInvites = useCallback(() => {
    invitationsApi
      .listMine()
      .then(setPendingInvites)
      .catch((error) => console.warn('Failed to load invitations:', error));
  }, []);

  const momentsShared = albums.reduce((sum, a) => sum + (a.photoCount || 0), 0);
  const lovedOnes = new Set(albums.flatMap((a) => a.members)).size;
  const yearsCaptured = new Set(albums.map((a) => new Date(a.eventDate).getFullYear())).size;

  const recentMemories = [...albums]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const doSignOut = async () => {
    setBusy(true);
    await signOut();
    router.replace('/login');
  };

  const settingsRows: Array<{
    label: string;
    Icon: typeof Shield;
    badge?: number;
    onClick?: () => void;
  }> = [
    {
      label: 'Invitations',
      Icon: Mail,
      badge: pendingInvites.length,
      onClick: () => router.push('/invitations'),
    },
    {
      label: 'Privacy & Security',
      Icon: Shield,
      onClick: () =>
        alert('Your vaults are protected by the Kindred backend. Only invited members can see or add memories.'),
    },
    {
      label: 'Notifications',
      Icon: Bell,
      onClick: () => alert('Notifications arrive when someone adds to your vaults.'),
    },
    {
      label: 'Appearance',
      Icon: Moon,
      onClick: () => alert('Kindred is shown in its signature cream light theme.'),
    },
    {
      label: 'Help & Support',
      Icon: HelpCircle,
      onClick: () => alert('For help with Kindred, check the READMEs in mobile/ and backend/, or open an issue on the project repository.'),
    },
  ];

  return (
    <AppShell>
      <div className="min-h-dvh bg-cream">
        <main className="px-8 pb-40 pt-8">
          {/* Profile card */}
          <div className="mb-11 flex flex-col items-center">
            <div className="relative mb-5">
              <Avatar uri={user?.photoURL} size={128} />
              <span className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-2xl border-4 border-cream bg-peach">
                <Sparkles size={16} color="#FDFBF7" fill="#FDFBF7" />
              </span>
            </div>
            <h1 className="font-display mb-2.5 text-[30px] font-semibold italic text-charcoal">
              {user?.displayName}
            </h1>
            <span className="caption text-center">
              Preserving frames since {user ? format(new Date(user.createdAt), 'yyyy') : '—'}
            </span>
          </div>

          {/* Stats grid */}
          <div className="mb-11 grid grid-cols-2 gap-3.5">
            {[
              { label: 'Albums Joined', value: String(albums.length), Icon: Layers, tinted: true },
              { label: 'Moments Shared', value: String(momentsShared), Icon: ImageIcon, tinted: false },
              { label: 'Loved Ones', value: String(lovedOnes), Icon: Users, tinted: false },
              { label: 'Years Captured', value: String(yearsCaptured), Icon: Calendar, tinted: false },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[32px] border border-charcoal/5 bg-white p-5 shadow-[0_4px_10px_rgba(0,0,0,0.05)]"
              >
                <span
                  className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${stat.tinted ? 'bg-peach/15' : 'bg-charcoal/[0.06]'}`}
                >
                  <stat.Icon size={20} color={stat.tinted ? '#E89E82' : '#2D2D2D'} />
                </span>
                <p className="font-display mb-0.5 text-[26px] font-semibold italic text-charcoal">
                  {stat.value}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-[1.5px] text-muted">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="mb-11 flex gap-3.5">
            <Link
              href="/create-album"
              className="flex flex-1 flex-col items-center gap-3 rounded-[32px] border border-charcoal/5 bg-white py-6 shadow-[0_4px_10px_rgba(0,0,0,0.05)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-charcoal">
                <Plus size={24} color="#FDFBF7" />
              </span>
              <span className="caption">New Vault</span>
            </Link>
            <button
              onClick={() => {
                if (recentMemories.length === 0) {
                  alert('No vaults yet — create a vault first to generate recaps.');
                  return;
                }
                router.push(`/album/${recentMemories[0].id}/recap`);
              }}
              className="flex flex-1 flex-col items-center gap-3 rounded-[32px] border border-charcoal/5 bg-white py-6 shadow-[0_4px_10px_rgba(0,0,0,0.05)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-beige">
                <Sparkles size={24} color="#2D2D2D" />
              </span>
              <span className="caption">Recaps</span>
            </button>
          </div>

          {/* Recently revisited */}
          {recentMemories.length > 0 && (
            <div className="mb-11">
              <span className="caption mb-[18px] block">Recently Revisited</span>
              <div className="rail-scroll flex gap-5 overflow-x-auto pb-2">
                {recentMemories.map((memory) => (
                  <Link
                    key={memory.id}
                    href={`/album/${memory.id}`}
                    className="w-[250px] shrink-0 rounded-3xl bg-white p-3.5 shadow-[0_8px_16px_rgba(0,0,0,0.12)]"
                  >
                    <div className="relative mb-3.5 aspect-[4/3] overflow-hidden rounded-2xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveAssetUrl(memory.coverPhotoURL)}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <span className="absolute left-2.5 top-2.5 rounded-full border border-white/35 bg-white/25 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[1px] text-white">
                        {memory.members.length} contributors
                      </span>
                    </div>
                    <p className="font-display truncate text-[17px] font-semibold italic text-charcoal">
                      {memory.title}
                    </p>
                    <p className="font-display text-[9px] font-bold uppercase italic tracking-[2px] text-muted">
                      {format(new Date(memory.eventDate), 'MMM d, yyyy')}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* On this day */}
          <button
            onClick={() =>
              alert('A year ago today, memories were being made. Keep adding moments to build this story.')
            }
            className="relative mb-11 min-h-[320px] w-full justify-end overflow-hidden rounded-[48px] p-9 text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ON_THIS_DAY_IMAGE}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
            <span className="absolute inset-0 bg-gradient-to-b from-charcoal/20 to-charcoal/85" />
            <span className="relative flex flex-col items-center">
              <span className="mb-5 rounded-lg border border-peach/40 bg-peach/25 px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-[2.5px] text-peach">
                On This Day
              </span>
              <span className="font-display mb-3 text-[28px] font-semibold italic text-white">
                A Year in Bloom
              </span>
              <span className="mb-6 max-w-[240px] text-center text-xs leading-[19px] text-white/65">
                One year ago, friends and family shared their favorite memories.
              </span>
              <span className="flex items-center">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} style={{ marginLeft: i === 1 ? 0 : -12 }}>
                    <Avatar
                      uri={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 6}`}
                      size={38}
                      className="border-2 border-charcoal"
                    />
                  </span>
                ))}
              </span>
            </span>
          </button>

          {/* Settings */}
          <div className="mt-11">
            <span className="caption">Settings &amp; Privacy</span>
            <div className="mt-[18px] overflow-hidden rounded-[40px] border border-charcoal/5 bg-white">
              {settingsRows.map((row, i) => (
                <button
                  key={row.label}
                  onClick={row.onClick}
                  className={`flex w-full items-center justify-between p-[22px] text-left ${i !== settingsRows.length - 1 ? 'border-b border-charcoal/5' : ''}`}
                >
                  <span className="flex items-center gap-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-beige">
                      <row.Icon size={20} color="#2D2D2D" />
                    </span>
                    <span className="text-sm font-semibold text-charcoal">{row.label}</span>
                  </span>
                  <span className="flex items-center gap-2.5">
                    {row.badge != null && row.badge > 0 && (
                      <span className="flex min-w-6 items-center justify-center rounded-full bg-peach px-1.5 py-0.5 text-xs font-bold text-white">
                        {row.badge}
                      </span>
                    )}
                    <ChevronRight size={16} color="#8C8C8C" />
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setConfirmSignOut(true)}
              className="mt-[22px] flex w-full items-center justify-center gap-2.5 rounded-[32px] bg-[#FEF2F2] py-[22px]"
            >
              <LogOut size={16} color="#EF4444" />
              <span className="text-[11px] font-bold uppercase tracking-[2.5px] text-danger">
                Sign Out of Kindred
              </span>
            </button>
          </div>
        </main>

        <FloatingNav active="profile" onCreate={() => router.push('/create-album')} />

        {/* Decorative gear */}
        <span
          className="pointer-events-none fixed right-8 top-16 flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-white shadow-[0_3px_8px_rgba(0,0,0,0.06)]"
          aria-hidden
        >
          <Settings size={22} color="#2D2D2D" opacity={0.7} />
        </span>

        <ConfirmDialog
          open={confirmSignOut}
          title="Sign out"
          body="Are you sure you want to sign out of Kindred?"
          confirmLabel="Sign Out"
          destructive
          busy={busy}
          onConfirm={() => void doSignOut()}
          onClose={() => setConfirmSignOut(false)}
        />
      </div>
    </AppShell>
  );
}
