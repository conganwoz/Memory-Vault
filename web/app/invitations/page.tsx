'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Mail, X } from 'lucide-react';
import { format } from 'date-fns';
import { invitationsApi } from '@/lib/api/endpoints';
import { useAuth } from '@/lib/auth-context';
import { Avatar, ConfirmDialog, PageHeader, Spinner } from '@/components/ui';
import AppShell from '@/components/AppShell';
import type { Invitation } from '@/lib/types';

export default function InvitationsPage() {
  const router = useRouter();
  const { refreshAlbums } = useAuth();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState<null | { invitation: Invitation; action: 'accept' | 'decline' }>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setInvitations(await invitationsApi.listMine());
    } catch (error) {
      console.warn('Failed to load invitations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmAction = async () => {
    if (!actionTarget) return;
    const { invitation, action } = actionTarget;
    setBusy(true);
    try {
      if (action === 'accept') {
        await invitationsApi.accept(invitation.id);
        await refreshAlbums();
        setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
        alert(`You joined! You're now a contributor to "${invitation.albumTitle ?? 'the vault'}".`);
        router.push('/home');
      } else {
        await invitationsApi.decline(invitation.id);
        setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
      }
      setActionTarget(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not process the invitation.');
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="min-h-dvh bg-cream">
        <PageHeader title="Invitations" backHref="/profile" />

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : invitations.length === 0 ? (
          <div className="flex flex-col items-center pb-16 pt-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-beige">
              <Mail size={26} color="#E89E82" />
            </div>
            <p className="font-display mt-4 text-[18px] font-bold italic text-charcoal">
              No pending invitations
            </p>
            <p className="mt-2 max-w-[280px] text-center text-[13px] leading-5 text-charcoal/50">
              When someone invites you to a vault, it shows up here for you to accept or decline.
            </p>
          </div>
        ) : (
          <main className="px-6 pb-16">
            <span className="caption">Pending invitations</span>

            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="mt-3.5 rounded-3xl border border-charcoal/5 bg-white p-[18px]"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    uri={`https://api.dicebear.com/7.x/avataaars/svg?seed=${invitation.inviterName ?? invitation.inviterId}`}
                    size={44}
                    className="border border-charcoal/5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-display truncate text-[16px] font-bold italic text-charcoal">
                      {invitation.albumTitle ?? 'Shared vault'}
                    </p>
                    <p className="truncate text-xs text-charcoal/55">
                      Invited by {invitation.inviterName ?? 'a friend'}
                    </p>
                    <p className="text-[10px] uppercase tracking-[1.5px] text-muted">
                      {invitation.createdAt
                        ? format(new Date(invitation.createdAt), 'MMMM d, yyyy')
                        : ''}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2.5">
                  <button
                    className="btn flex-1 bg-beige !text-charcoal"
                    onClick={() => setActionTarget({ invitation, action: 'decline' })}
                  >
                    <X size={14} />
                    Decline
                  </button>
                  <button
                    className="btn btn-dark flex-1"
                    onClick={() => setActionTarget({ invitation, action: 'accept' })}
                  >
                    <Check size={14} color="#FDFBF7" />
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </main>
        )}

        <ConfirmDialog
          open={actionTarget !== null}
          title={
            actionTarget?.action === 'accept' ? 'Accept invitation?' : 'Decline invitation?'
          }
          body={
            actionTarget?.action === 'accept'
              ? `You'll become a contributor to "${actionTarget.invitation.albumTitle ?? 'this vault'}" and can add photos to it.`
              : `The invitation to "${actionTarget?.invitation.albumTitle ?? 'this vault'}" will be removed.`
          }
          confirmLabel={actionTarget?.action === 'accept' ? 'Accept' : 'Decline'}
          destructive={actionTarget?.action === 'decline'}
          busy={busy}
          onConfirm={() => void confirmAction()}
          onClose={() => setActionTarget(null)}
        />
      </div>
    </AppShell>
  );
}
