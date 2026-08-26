import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { ChevronLeft, Crown, Check } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../App';
import { useFirebase } from '../lib/FirebaseProvider';
import { meApi } from '../lib/api/endpoints';
import { PLANS, planById, priceFor } from '../lib/plans';
import { purchasePlan } from '../lib/purchases';
import { colors, radius } from '../lib/theme';
import { Spinner } from '../lib/ui';
import type { PlanId, PlanInfo, PlanPeriod } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Plans'>;

export default function PlansScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { refreshAlbums } = useFirebase();

  const [info, setInfo] = useState<PlanInfo | null>(null);
  const [period, setPeriod] = useState<PlanPeriod>('monthly');
  const [busy, setBusy] = useState(false);

  // Silent refresh on focus (keeps the screen mounted — see AlbumDetail notes).
  const load = useCallback(async () => {
    try {
      setInfo(await meApi.plan());
    } catch (error) {
      console.warn('Failed to load plan:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const upgrade = async (plan: PlanId) => {
    if (plan === 'default' || busy) return;
    setBusy(true);
    try {
      const updated = await purchasePlan(plan, period);
      setInfo(updated);
      await refreshAlbums();
      Alert.alert(
        'Plan activated',
        `You're now on the ${plan === 'pro' ? 'Pro' : 'Basic'} plan. Enjoy the extra space!`
      );
    } catch (error) {
      console.warn('Purchase failed:', error);
      Alert.alert(
        'Could not activate plan',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  const currentPlan = info?.plan ?? 'default';
  const currentDef = planById(currentPlan);
  const albumsUsed = info?.usage.albums ?? 0;
  const albumsLimit = info?.limits.maxAlbums ?? currentDef.maxAlbums;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ChevronLeft width={22} height={22} color={colors.charcoal} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Subscription</Text>
          <Text style={styles.subtitle}>Pick the plan that fits your story.</Text>
        </View>
      </View>

      {!info ? (
        <View style={styles.center}>
          <Spinner />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Current plan */}
          <View style={styles.currentCard}>
            <View style={styles.currentIcon}>
              <Crown width={22} height={22} color={colors.white} />
            </View>
            <View style={styles.currentInfo}>
              <Text style={styles.currentName}>{currentDef.name} plan</Text>
              <Text style={styles.currentUsage}>
                {albumsUsed} of {albumsLimit} vaults used · up to{' '}
                {currentDef.maxPhotosPerAlbum} photos per vault
              </Text>
              {info.plan !== 'default' && info.expiresAt && (
                <Text style={styles.currentExpiry}>
                  Renews {format(new Date(info.expiresAt), 'MMM d, yyyy')}
                </Text>
              )}
            </View>
          </View>

          {/* Period toggle */}
          <View style={styles.periodToggle}>
            {(['monthly', 'yearly'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                activeOpacity={0.85}
                onPress={() => setPeriod(p)}
                style={[styles.periodButton, period === p && styles.periodButtonActive]}
              >
                <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                  {p === 'monthly' ? 'Monthly' : 'Yearly'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Plan cards */}
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const isFree = plan.id === 'default';
            return (
              <View
                key={plan.id}
                style={[styles.planCard, isCurrent && styles.planCardCurrent]}
              >
                <View style={styles.planRow}>
                  <View style={[styles.planDot, { backgroundColor: plan.accent }]} />
                  <View style={styles.planInfo}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planTagline}>{plan.tagline}</Text>
                    <Text style={styles.planLimits}>
                      {plan.maxAlbums} vaults · {plan.maxPhotosPerAlbum} photos each
                    </Text>
                  </View>
                  <Text style={styles.planPrice}>{priceFor(plan, period)}</Text>
                </View>

                {isCurrent ? (
                  <View style={[styles.planButton, styles.planButtonCurrent]}>
                    <Check width={14} height={14} color={colors.white} />
                    <Text style={styles.planButtonCurrentText}>Current plan</Text>
                  </View>
                ) : isFree ? (
                  <View style={[styles.planButton, styles.planButtonFree]}>
                    <Text style={styles.planButtonFreeText}>Free forever</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => void upgrade(plan.id)}
                    disabled={busy}
                    style={[
                      styles.planButton,
                      styles.planButtonUpgrade,
                      { backgroundColor: plan.accent },
                      busy && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={styles.planButtonUpgradeText}>
                      {busy ? 'Activating…' : `Choose ${plan.name}`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          <Text style={styles.note}>
            {'In this build, purchases are simulated so you can try the flow. Real ' +
              'App Store / Google Play billing will be enabled in the store build.'}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.beige,
    borderWidth: 1,
    borderColor: 'rgba(45,45,45,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    fontStyle: 'italic',
    color: colors.charcoal,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(45,45,45,0.5)',
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 64,
  },

  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.charcoal,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 22,
  },
  currentIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentInfo: { flex: 1 },
  currentName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    fontStyle: 'italic',
    marginBottom: 3,
  },
  currentUsage: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 18,
  },
  currentExpiry: {
    color: colors.peach,
    fontSize: 11,
    marginTop: 4,
  },

  periodToggle: {
    flexDirection: 'row',
    backgroundColor: colors.beige,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: 20,
    alignSelf: 'center',
  },
  periodButton: {
    paddingHorizontal: 26,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  periodButtonActive: {
    backgroundColor: colors.white,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  periodTextActive: {
    color: colors.charcoal,
  },

  planCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(45,45,45,0.05)',
    padding: 18,
    marginBottom: 14,
  },
  planCardCurrent: {
    borderWidth: 2,
    borderColor: colors.peach,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  planDot: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
  },
  planInfo: { flex: 1 },
  planName: {
    fontSize: 17,
    fontWeight: '700',
    fontStyle: 'italic',
    color: colors.charcoal,
    marginBottom: 2,
  },
  planTagline: {
    fontSize: 12,
    color: 'rgba(45,45,45,0.5)',
    marginBottom: 4,
  },
  planLimits: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.charcoal,
  },
  planPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.charcoal,
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  planButtonCurrent: {
    backgroundColor: colors.charcoal,
  },
  planButtonCurrentText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  planButtonFree: {
    backgroundColor: colors.beige,
  },
  planButtonFreeText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  planButtonUpgrade: {
    backgroundColor: colors.peach,
  },
  planButtonUpgradeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  note: {
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(45,45,45,0.45)',
  },
});

