'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { resolveAssetUrl } from '@/lib/config';
import type { Album } from '@/lib/types';

export default function AlbumCard({ album }: { album: Album }) {
  return (
    <Link href={`/album/${album.id}`} className="group relative mb-9 block">
      {/* Book-stack effect */}
      <span
        className="absolute inset-0 translate-x-2 translate-y-2 rounded-[40px] bg-charcoal/[0.06]"
        aria-hidden
      />
      <span
        className="absolute inset-0 translate-x-1 translate-y-1 rounded-[40px] bg-charcoal/[0.06]"
        aria-hidden
      />
      <span className="relative block aspect-[4/5] overflow-hidden rounded-[40px] border border-white/50 bg-[#EDE9E1] shadow-[0_14px_24px_rgba(0,0,0,0.25)] transition-transform duration-300 group-hover:-translate-y-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveAssetUrl(album.coverPhotoURL)}
          alt={album.title}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <span className="absolute inset-0 bg-charcoal/28" aria-hidden />
        <span className="absolute inset-x-7 bottom-7">
          <span className="font-display mb-2 block text-2xl font-semibold italic leading-[30px] text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]">
            {album.title}
          </span>
          <span className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/85">
            {format(new Date(album.eventDate), 'MMM d, yyyy')} • {album.photoCount} Moments
          </span>
        </span>
      </span>
    </Link>
  );
}
