/**
 * Subscription plan catalog — the in-app-purchase tiers and their limits.
 *
 * Prices are the recommended retail values; the exact amount charged comes
 * from the store product configured in App Store Connect / Google Play.
 */
import { colors } from './theme';
import type { PlanId, PlanPeriod } from './types';

export interface PlanDef {
  id: PlanId;
  name: string;
  tagline: string;
  maxAlbums: number;
  maxPhotosPerAlbum: number;
  monthly?: number;
  yearly?: number;
  accent: string;
}

export const PLANS: PlanDef[] = [
  {
    id: 'default',
    name: 'Default',
    tagline: 'Start sharing your story',
    maxAlbums: 2,
    maxPhotosPerAlbum: 10,
    accent: colors.muted,
  },
  {
    id: 'basic',
    name: 'Basic',
    tagline: 'For growing families',
    maxAlbums: 30,
    maxPhotosPerAlbum: 200,
    monthly: 2.99,
    yearly: 29.99,
    accent: colors.peach,
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For the whole story',
    maxAlbums: 100,
    maxPhotosPerAlbum: 500,
    monthly: 4.99,
    yearly: 39.99,
    accent: colors.charcoal,
  },
];

export function planById(id: PlanId | undefined): PlanDef {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function priceFor(plan: PlanDef, period: PlanPeriod): string {
  const price = period === 'monthly' ? plan.monthly : plan.yearly;
  if (!price) return 'Free';
  return `$${price.toFixed(2)}/${period === 'monthly' ? 'mo' : 'yr'}`;
}
