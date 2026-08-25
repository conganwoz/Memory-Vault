import React, { useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Settings,
  ChevronRight,
  LogOut,
  Shield,
  Bell,
  Moon,
  HelpCircle,
  Plus,
  Users,
  Image as ImageIcon,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react-native';
import { format } from 'date-fns';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import type { RootStackParamList } from '../App';
import { useFirebase } from '../lib/FirebaseProvider';
import { resolveAssetUrl } from '../lib/config';
import { colors, radius } from '../lib/theme';
import { Avatar, Caption, FloatingNav } from '../lib/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const ON_THIS_DAY_IMAGE =
  'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800';

export default function ProfileScreen({ navigation }: Props) {
  const { user, albums, signOut, refreshAlbums } = useFirebase();

  // Re-fetch albums whenever the profile screen gains focus.
  useFocusEffect(
    useCallback(() => {
      void refreshAlbums();
    }, [refreshAlbums])
  );

  const momentsShared = albums.reduce((sum, a) => sum + (a.photoCount || 0), 0);
  const lovedOnes = new Set(albums.flatMap((a) => a.members)).size;
  const yearsCaptured = new Set(
    albums.map((a) => new Date(a.eventDate).getFullYear())
  ).size;

  const recentMemories = [...albums]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out of Kindred?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const openRecaps = () => {
    if (recentMemories.length === 0) {
      Alert.alert('No vaults yet', 'Create a vault first to generate recaps.');
      return;
    }
    navigation.navigate('Recap', { albumId: recentMemories[0].id });
  };

  const settingsRows: Array<{
    label: string;
    Icon: typeof Shield;
    onPress?: () => void;
  }> = [
    {
      label: 'Privacy & Security',
      Icon: Shield,
      onPress: () =>
        Alert.alert(
          'Privacy & Security',
          'Your vaults are protected by Firebase security rules. Only invited members can see or add memories.'
        ),
    },
    {
      label: 'Notifications',
      Icon: Bell,
      onPress: () =>
        Alert.alert(
          'Notifications',
          'Push notifications arrive when someone adds to your vaults. Configure them in system settings.'
        ),
    },
    {
      label: 'Appearance',
      Icon: Moon,
      onPress: () =>
        Alert.alert(
          'Appearance',
          'Kindred follows your device appearance. Light mode is used while the system is set to light.'
        ),
    },
    {
      label: 'Help & Support',
      Icon: HelpCircle,
      onPress: () =>
        Alert.alert(
          'Help & Support',
          'For help with Kindred, check the READMEs in react-native-app/ and backend/, or open an issue on the project repository.'
        ),
    },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={styles.profileSection}>
          <View style={styles.avatarWrap}>
            <Avatar uri={user?.photoURL} size={128} />
            <View style={styles.avatarBadge}>
              <Sparkles width={16} height={16} color={colors.white} fill={colors.white} />
            </View>
          </View>
          <Text style={styles.displayName}>{user?.displayName}</Text>
          <Caption align="center">
            Preserving frames since{' '}
            {user ? format(new Date(user.createdAt), 'yyyy') : '—'}
          </Caption>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Albums Joined', value: String(albums.length), Icon: Layers, tinted: true },
            { label: 'Moments Shared', value: String(momentsShared), Icon: ImageIcon, tinted: false },
            { label: 'Loved Ones', value: String(lovedOnes), Icon: Users, tinted: false },
            { label: 'Years Captured', value: String(yearsCaptured), Icon: Calendar, tinted: false },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <View
                style={[
                  styles.statIcon,
                  stat.tinted && styles.statIconTinted,
                ]}
              >
                <stat.Icon
                  width={20}
                  height={20}
                  color={stat.tinted ? colors.peach : colors.charcoal}
                />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('CreateAlbum')}
            style={styles.quickActionCard}
          >
            <View style={[styles.quickActionIcon, styles.quickActionIconDark]}>
              <Plus width={24} height={24} color={colors.white} />
            </View>
            <Caption>New Vault</Caption>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={openRecaps}
            style={styles.quickActionCard}
          >
            <View style={styles.quickActionIcon}>
              <Sparkles width={24} height={24} color={colors.charcoal} />
            </View>
            <Caption>Recaps</Caption>
          </TouchableOpacity>
        </View>

        {/* Recently revisited */}
        {recentMemories.length > 0 && (
          <View style={{ marginBottom: 44 }}>
            <View style={styles.sectionRow}>
              <Caption>Recently Revisited</Caption>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentScroll}
            >
              {recentMemories.map((memory) => (
                <TouchableOpacity
                  key={memory.id}
                  activeOpacity={0.9}
                  onPress={() =>
                    navigation.navigate('AlbumDetail', { albumId: memory.id })
                  }
                  style={styles.memoryCard}
                >
                  <View style={styles.memoryImageWrap}>
                    <Image
                      source={{ uri: resolveAssetUrl(memory.coverPhotoURL) }}
                      style={styles.memoryImage}
                    />
                    <View style={styles.contributorChip}>
                      <Text style={styles.contributorChipText}>
                        {memory.members.length} contributors
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.memoryTitle} numberOfLines={1}>
                    {memory.title}
                  </Text>
                  <Text style={styles.memoryDate}>
                    {format(new Date(memory.eventDate), 'MMM d, yyyy')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* On this day */}
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() =>
            Alert.alert(
              'On This Day',
              'A year ago today, memories were being made. Keep adding moments to build this story.'
            )
          }
          style={styles.onThisDay}
        >
          <Image source={{ uri: ON_THIS_DAY_IMAGE }} style={styles.onThisDayImage} />
          <LinearGradient
            colors={['rgba(45,45,45,0.2)', 'rgba(45,45,45,0.85)']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.onThisDayInner}>
            <View style={styles.onThisDayBadge}>
              <Text style={styles.onThisDayBadgeText}>On This Day</Text>
            </View>
            <Text style={styles.onThisDayTitle}>A Year in Bloom</Text>
            <Text style={styles.onThisDayBody}>
              One year ago, friends and family shared their favorite memories.
            </Text>
            <View style={styles.onThisDayAvatars}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={{ marginLeft: i === 1 ? 0 : -12 }}>
                  <Avatar
                    uri={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 6}`}
                    size={38}
                    borderWidth={2}
                    borderColor={colors.charcoal}
                  />
                </View>
              ))}
            </View>
          </View>
        </TouchableOpacity>

        {/* Settings */}
        <View style={{ marginTop: 44 }}>
          <Caption>Settings & Privacy</Caption>
          <View style={styles.settingsGroup}>
            {settingsRows.map((row, i) => (
              <TouchableOpacity
                key={row.label}
                activeOpacity={0.8}
                onPress={row.onPress}
                style={[
                  styles.settingsRow,
                  i !== settingsRows.length - 1 && styles.settingsRowDivider,
                ]}
              >
                <View style={styles.settingsRowLeft}>
                  <View style={styles.settingsIcon}>
                    <row.Icon width={20} height={20} color={colors.charcoal} />
                  </View>
                  <Text style={styles.settingsLabel}>{row.label}</Text>
                </View>
                <ChevronRight width={16} height={16} color={colors.muted} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={confirmSignOut}
            style={styles.signOutButton}
          >
            <LogOut width={16} height={16} color={colors.danger} />
            <Text style={styles.signOutText}>Sign Out of Kindred</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <FloatingNav
        active="profile"
        onHome={() => navigation.navigate('Home')}
        onCreate={() => navigation.navigate('CreateAlbum')}
        onProfile={() => {}}
      />

      {/* Decorative settings gear */}
      <View pointerEvents="none" style={styles.gearDecor}>
        <Settings width={22} height={22} color={colors.charcoal} opacity={0.7} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 64,
    paddingBottom: 160,
  },

  profileSection: {
    alignItems: 'center',
    marginBottom: 44,
  },
  avatarWrap: { marginBottom: 22 },
  avatarBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.peach,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    fontSize: 30,
    fontStyle: 'italic',
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 10,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 44,
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(45,45,45,0.05)',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(45,45,45,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statIconTinted: { backgroundColor: 'rgba(232,158,130,0.15)' },
  statValue: {
    fontSize: 26,
    fontStyle: 'italic',
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.muted,
  },

  quickActions: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 44,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(45,45,45,0.05)',
    paddingVertical: 26,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.beige,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIconDark: { backgroundColor: colors.charcoal },

  sectionRow: { marginBottom: 18 },
  recentScroll: { paddingRight: 32, gap: 20 },
  memoryCard: {
    width: 250,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  memoryImageWrap: {
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: 14,
  },
  memoryImage: { width: '100%', height: '100%' },
  contributorChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  contributorChipText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  memoryTitle: {
    fontSize: 17,
    fontStyle: 'italic',
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 3,
  },
  memoryDate: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontStyle: 'italic',
    color: colors.muted,
  },

  onThisDay: {
    borderRadius: 48,
    overflow: 'hidden',
    padding: 36,
    minHeight: 320,
    justifyContent: 'flex-end',
  },
  onThisDayImage: { ...StyleSheet.absoluteFillObject },
  onThisDayInner: { alignItems: 'center' },
  onThisDayBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(232,158,130,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(232,158,130,0.4)',
    marginBottom: 20,
  },
  onThisDayBadgeText: {
    color: colors.peach,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  onThisDayTitle: {
    color: colors.white,
    fontSize: 28,
    fontStyle: 'italic',
    fontWeight: '600',
    marginBottom: 12,
  },
  onThisDayBody: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 240,
    marginBottom: 26,
  },
  onThisDayAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  settingsGroup: {
    marginTop: 18,
    backgroundColor: colors.white,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(45,45,45,0.05)',
    overflow: 'hidden',
    marginBottom: 22,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 22,
  },
  settingsRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(45,45,45,0.05)',
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.beige,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.charcoal,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    paddingVertical: 22,
    borderRadius: 32,
  },
  signOutText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },

  gearDecor: {
    position: 'absolute',
    top: 64,
    right: 32,
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
});