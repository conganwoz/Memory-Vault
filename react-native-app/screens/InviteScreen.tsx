import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  ChevronLeft,
  Copy,
  Check,
  Users,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../App';
import { useFirebase } from '../lib/FirebaseProvider';
import { invitesApi } from '../lib/api/endpoints';
import { colors, radius } from '../lib/theme';
import { Avatar, Caption } from '../lib/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Invite'>;

export default function InviteScreen({ route, navigation }: Props) {
  const { albumId } = route.params;
  const { albums } = useFirebase();
  const album = albums.find((a) => a.id === albumId);

  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  // Ask the backend for a fresh invite code for this album.
  useEffect(() => {
    let cancelled = false;
    invitesApi
      .create(albumId)
      .then((invite) => {
        if (!cancelled) setInviteCode(invite.code);
      })
      .catch((error) => console.warn('Failed to create invite:', error));
    return () => {
      cancelled = true;
    };
  }, [albumId]);

  const inviteLink = inviteCode
    ? `https://kindred.app/invite/${inviteCode}`
    : `https://kindred.app/invite/${albumId ?? ''}`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: album ? `Join "${album.title}" on Kindred` : 'Join my Kindred vault',
        message: `You've been invited to share memories in "${
          album?.title ?? 'my memory vault'
        }" on Kindred. Open the app and use this invite code: ${inviteLink}`,
        url: inviteLink,
      });
    } catch {
      // User cancelled or share unavailable — nothing to do.
    }
  };

  if (!album) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.missing}>Vault not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.missingLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, styles.headerSafe]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ChevronLeft width={24} height={24} color={colors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite Loved Ones</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <View style={styles.qrBadgeWrap}>
            <View style={styles.qrBadge}>
              <Text style={styles.qrText}>QR</Text>
            </View>
          </View>

          <Text style={styles.headline}>Preserve memories, together.</Text>
          <Text style={styles.subline}>
            Let others add their perspective to{' '}
            <Text style={styles.albumName}>"{album.title}"</Text>
          </Text>

          <View style={styles.linkRow}>
            <Copy width={14} height={14} color="rgba(45,45,45,0.4)" />
            <Text style={styles.linkText} numberOfLines={1}>
              {inviteLink}
            </Text>
            <TouchableOpacity hitSlop={8} onPress={handleCopy}>
              <Text style={styles.copyButton}>
                {copied ? 'COPIED' : 'COPY'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleShare}
            style={styles.shareButton}
          >
            <Text style={styles.shareButtonText}>Share Invite Link</Text>
          </TouchableOpacity>
        </View>

        {/* Contributors */}
        <Caption>Current Contributors</Caption>
        <View style={styles.contributorsRow}>
          {album.members.slice(0, 8).map((member, i) => (
            <View key={`${member}-${i}`} style={{ marginLeft: i === 0 ? 0 : -12 }}>
              <Avatar
                uri={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member}`}
                size={44}
                borderWidth={2}
              />
            </View>
          ))}
          {album.members.length > 8 && (
            <View style={styles.overflowBadge}>
              <Text style={styles.overflowText}>
                +{album.members.length - 8}
              </Text>
            </View>
          )}
          {album.members.length === 0 && (
            <Users width={20} height={20} color={colors.muted} />
          )}
        </View>
        {copied && (
          <View style={styles.copiedToast}>
            <Check width={12} height={12} color={colors.success} />
            <Text style={styles.copiedToastText}>Invite link copied</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  center: { alignItems: 'center', justifyContent: 'center' },
  missing: {
    fontSize: 22,
    fontStyle: 'italic',
    color: colors.charcoal,
    marginBottom: 12,
  },
  missingLink: { color: colors.peach, fontWeight: '700' },
  headerSafe: { paddingTop: 56 },
  header: {
    paddingHorizontal: 32,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontStyle: 'italic',
    fontWeight: '600',
    color: colors.charcoal,
  },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 48,
  },
  heroSection: { alignItems: 'center', marginBottom: 44 },
  qrBadgeWrap: {
    width: 96,
    height: 96,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.beige,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  qrBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  qrText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headline: {
    fontSize: 24,
    fontStyle: 'italic',
    fontWeight: '600',
    color: colors.charcoal,
    textAlign: 'center',
    marginBottom: 14,
  },
  subline: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 36,
  },
  albumName: {
    fontWeight: '700',
    fontStyle: 'italic',
    color: colors.charcoal,
  },
  linkRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.beige,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(45,45,45,0.05)',
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 22,
  },
  linkText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Courier',
    color: 'rgba(45,45,45,0.4)',
  },
  copyButton: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.peach,
  },
  shareButton: {
    alignSelf: 'stretch',
    backgroundColor: colors.charcoal,
    paddingVertical: 19,
    borderRadius: radius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 9,
  },
  shareButtonText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  contributorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  overflowBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    marginLeft: -12,
    backgroundColor: colors.beige,
    borderWidth: 2,
    borderColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
  },
  copiedToast: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  copiedToastText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.charcoal,
  },
});