/**
 * In-app purchase seam for subscription plans.
 *
 * Real App Store / Google Play billing requires a development build and
 * store-configured products (created in App Store Connect / Play Console).
 * Until then, purchases are SIMULATED — the plan is applied directly on the
 * backend so the full upgrade flow is testable in Expo Go.
 *
 * To enable real billing later:
 *   1. `npx expo install react-native-iap` (or RevenueCat's react-native-purchases)
 *   2. Create the subscription products in App Store Connect / Google Play
 *   3. Replace `purchasePlan` below with the store purchase flow, then have the
 *      backend validate the receipt / a server-to-server webhook.
 */
import { meApi } from './api/endpoints';
import type { PlanInfo, PlanPeriod } from './types';

const DAYS: Record<PlanPeriod, number> = { monthly: 30, yearly: 365 };

export async function purchasePlan(
  plan: 'basic' | 'pro',
  period: PlanPeriod
): Promise<PlanInfo> {
  // TODO(real IAP): request the store product, complete the purchase, and
  // validate the receipt server-side instead of trusting the client.
  return meApi.applyPlan(plan, DAYS[period]);
}
