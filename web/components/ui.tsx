'use client';

import React from 'react';
import { ChevronLeft, User } from 'lucide-react';
import Link from 'next/link';
import { resolveAssetUrl } from '@/lib/config';

export function Spinner({ light }: { light?: boolean }) {
  return (
    <span
      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-transparent"
      style={{
        borderTopColor: light ? '#E89E82' : '#2D2D2D',
        borderRightColor: light ? '#E89E82' : '#2D2D2D',
      }}
    />
  );
}

export function Avatar({
  uri,
  size = 40,
  className = '',
}: {
  uri?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden bg-beige ${className}`}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      {uri ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveAssetUrl(uri)}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center"
          style={{ width: size, height: size }}
        >
          <User size={size * 0.5} color="#8C8C8C" />
        </span>
      )}
    </span>
  );
}

export function BackButton({ href, onClick }: { href?: string; onClick?: () => void }) {
  const inner = (
    <span className="glass glass-light">
      <ChevronLeft size={24} />
    </span>
  );
  if (href) {
    return (
      <Link href={href} aria-label="Go back">
        {inner}
      </Link>
    );
  }
  return (
    <button onClick={onClick} aria-label="Go back">
      {inner}
    </button>
  );
}

export function PageHeader({
  title,
  backHref,
  onBack,
  right,
}: {
  title: string;
  backHref?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between px-6 pb-3 pt-6 sm:px-8">
      <div className="flex items-center gap-3">
        <BackButton href={backHref} onClick={onBack} />
        <h1 className="font-display text-[17px] font-semibold italic text-charcoal">{title}</h1>
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Modal / confirm dialogs
// ---------------------------------------------------------------------------

export function Modal({
  open,
  onClose,
  children,
  title,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${wide ? 'max-w-lg' : 'max-w-sm'} rounded-3xl bg-cream p-6 shadow-2xl animate-pop-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h3 className="font-display mb-4 text-center text-xl font-semibold italic text-charcoal">
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
  onClose,
  busy = false,
}: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <p className="mb-5 text-center text-sm leading-relaxed text-muted">{body}</p>
      <div className="flex gap-3">
        <button
          className="btn flex-1 bg-beige !text-charcoal"
          onClick={onClose}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          className={`btn flex-1 ${destructive ? 'btn-danger' : 'btn-dark'}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? <Spinner light /> : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Floating bottom navigation
// ---------------------------------------------------------------------------

export function FloatingNav({
  active,
  onCreate,
}: {
  active: 'home' | 'profile';
  onCreate: () => void;
}) {
  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-7 z-40 flex justify-center px-6"
      aria-label="Primary"
    >
      <div className="pointer-events-auto flex h-[76px] w-full max-w-[380px] items-center justify-around rounded-full bg-charcoal px-8 shadow-[0_10px_20px_rgba(0,0,0,0.25)]">
        <Link
          href="/home"
          aria-label="Home"
          className="rounded-xl p-2"
          style={{ color: active === 'home' ? '#E89E82' : 'rgba(253,251,247,0.4)' }}
        >
          <HomeIcon size={24} />
        </Link>
        <button
          onClick={onCreate}
          aria-label="Create vault"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream text-charcoal"
        >
          <PlusIcon size={26} />
        </button>
        <Link
          href="/profile"
          aria-label="Profile"
          className="rounded-xl p-2"
          style={{ color: active === 'profile' ? '#E89E82' : 'rgba(253,251,247,0.4)' }}
        >
          <User size={24} />
        </Link>
      </div>
    </nav>
  );
}

function HomeIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function PlusIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
