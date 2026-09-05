'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Mail, RotateCcw, Send, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { invitationsApi } from '@/lib/api/endpoints';
import { Avatar, ConfirmDialog, PageHeader, Spinner } from '@/components/ui';
import AppShell from '@/components/AppShell';
import type { Invitation } from '@/lib/types';

export default function InvitePage() {
  const { albumId = '' } = useParams<{ albumId: string }>();
  const { albums } = useAuth();
  const album = albums.find((a) => a.id === albumId);

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<Invitation[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);
  const [revoking, setRevoking] = useState(false);

  const loadPending = useCallback(async () => {
    try {
      setPending(await invitationsApi.listForAlbum(albumId));
    } catch (error) {
      console.warn('Failed to load pending invitations:', error);
    } finally {
      setLoadingPending(false);
    }
  }, [albumId]);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  const sendInvite = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setNotice('Enter an email address first.');
      return;
    }
    setSending(true);
    setNotice(null);
    try {
      const invitation = await invitationsApi.create(albumId, trimmed);
      setEmail('');
      setNotice(`Invitation sent to ${invitation.inviteeName ?? trimmed}.`);
      void loadPending();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not send the invite.');
    } finally {
      setSending(false);
    }
  };

  const revoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await invitationsApi.revoke(revokeTarget.id);
      setPending((prev) => prev.filter((i) => i.id !== revokeTarget.id));
      setRevokeTarget(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not revoke invitation.');
      setRevoking(false);
    }
  };

  if (!album) {
    return (
      <AppShell>
        <div className="flex min-h-dvh flex-col items-center justify-center bg-cream">
          <p className="font-display mb-3 text-[22px] italic text-charcoal">Vault not found</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-dvh bg-cream">
        <PageHeader title="Invite Loved Ones" backHref={`/album/${albumId}`} />

        <main className="px-8 pb-20">
          {/* Invite by email */}
          <span className="caption">Invite by email</span>
          <div className="mt-3.5 rounded-3xl border border-charcoal/5 bg-white p-[22px]">
            <h2 className="font-display mb-2 text-[19px] font-semibold italic text-charcoal">
              Add a contributor to &ldquo;{album.title}&rdquo;
            </h2>
            <p className="mb-[18px] text-[13px] leading-5 text-charcoal/55">
              Enter the email of a Kindred account. They&apos;ll see the invitation in their
              profile and can accept it to join this vault.
            </p>

            <form
              className="mb-3.5 flex items-center gap-2.5 rounded-2xl bg-beige px-4"
              onSubmit={(e) => {
                e.preventDefault();
                void sendInvite();
              }}
            >
              <Mail size={18} color="#8C8C8C" />
              <input
                className="w-full bg-transparent py-[15px] text-sm text-charcoal outline-none"
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </form>

            {notice && <p className="font-display mb-3 text-xs italic text-peach">{notice}</p>}

            <button
              className="btn btn-dark w-full"
              onClick={() => void sendInvite()}
              disabled={sending}
            >
              {sending ? <Spinner light /> : (
                <>
                  <Send size={14} color="#FDFBF7" />
                  Send Invite
                </>
              )}
            </button>
          </div>

          {/* Pending invitations */}
          <section className="mt-9">
            <span className="caption">Pending invitations</span>
            {loadingPending ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : pending.length === 0 ? (
              <p className="font-display py-3 text-[13px] italic text-charcoal/45">
                No one has been invited yet. Invite someone above to start sharing memories.
              </p>
            ) : (
              pending.map((invitation) => (
                <div
                  key={invitation.id}
                  className="mt-2.5 flex items-center gap-3 rounded-2xl border border-charcoal/5 bg-white p-3.5"
                >
                  <Avatar
                    uri={`https://api.dicebear.com/7.x/avataaars/svg?seed=${invitation.inviteeEmail ?? invitation.inviteeId}`}
                    size={40}
                    className="border border-charcoal/5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-charcoal">
                      {invitation.inviteeName ?? invitation.inviteeEmail}
                    </p>
                    <p className="truncate text-xs text-charcoal/50">
                      {invitation.inviteeEmail ?? ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setRevokeTarget(invitation)}
                    className="flex items-center gap-1.5 rounded-full bg-[#FEF2F2] px-3 py-2"
                  >
                    <RotateCcw size={12} color="#EF4444" />
                    <span className="text-[10px] font-bold uppercase tracking-[1px] text-danger">
                      Revoke
                    </span>
                  </button>
                </div>
              ))
            )}
          </section>

          {/* Current contributors */}
          <section className="mt-9">
            <span className="caption">Current contributors</span>
            <div className="mt-3.5 flex items-center">
              {album.members.slice(0, 8).map((member, i) => (
                <span key={`${member}-${i}`} style={{ marginLeft: i === 0 ? 0 : -12 }}>
                  <Avatar
                    uri={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member}`}
                    size={44}
                    className="border-2 border-cream"
                  />
                </span>
              ))}
              {album.members.length > 8 && (
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-cream bg-beige text-[10px] font-bold text-charcoal"
                  style={{ marginLeft: -12 }}
                >
                  +{album.members.length - 8}
                </span>
              )}
              {album.members.length === 0 && <Users size={20} color="#8C8C8C" />}
            </div>
          </section>
        </main>

        <ConfirmDialog
          open={revokeTarget !== null}
          title="Revoke invitation?"
          body={`${revokeTarget?.inviteeName ?? 'This person'} will no longer be able to accept it.`}
          confirmLabel="Revoke"
          destructive
          busy={revoking}
          onConfirm={() => void revoke()}
          onClose={() => setRevokeTarget(null)}
        />
      </div>
    </AppShell>
  );
}
