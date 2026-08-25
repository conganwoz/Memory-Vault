import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { ChevronLeft, Check, X, Mail } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../App';
import { useFirebase } from '../lib/FirebaseProvider';
import { invitationsApi } from '../lib/api/endpoints';
import { colors, radius } from '../lib/theme';
import { Avatar, Caption, Spinner } from '../lib/ui';
import type { Invitation } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Invitations'>;

export default function InvitationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { refreshAlbums } = useFirebase();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Silent refresh on focus (keeps the list mounted — see AlbumDetail notes).
  const load = useCallback(async () => {
    try {
      setInvitations(await invitationsApi.listMine());
    } catch (error) {
      console.warn('Failed to load invitations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const accept = (invitation: Invitation) => {
    Alert.alert(
      'Accept invitation?',
      `You'll become a contributor to "${invitation.albumTitle ?? 'this vault'}" and can add photos to it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () =>
            void (async () => {
              try {
                await invitationsApi.accept(invitation.id);
                await refreshAlbums();
                setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
                Alert.alert(
                  'You joined!',
                  `You're now a contributor to "${invitation.albumTitle ?? 'the vault'}".`
                );
              } catch (error) {
                console.warn('Failed to accept invitation:', error);
                Alert.alert(
                  'Could not accept invitation',
                  error instanceof Error ? error.message : 'Please try again.'
                );
              }
            })(),
        },
      ]
    );
  };

  const decline = (invitation: Invitation) => {
    Alert.alert(
      'Decline invitation?',
      `The invitation to "${invitation.albumTitle ?? 'this vault'}" will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () =>
            void (async () => {
              try {
                await invitationsApi.decline(invitation.id);
                setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
              } catch (error) {
                console.warn('Failed to decline invitation:', error);
                Alert.alert(
                  'Could not decline invitation',
                  error instanceof Error ? error.message : 'Please try again.'
                );
              }
            })(),
        },
      ]
    );
  };

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
          <Text style={styles.title}>Invitations</Text>
          <Text style={styles.subtitle}>Accept to join a vault as a contributor.</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Spinner />
        </View>
      ) : invitations.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Mail width={26} height={26} color={colors.peach} />
          </View>
          <Text style={styles.emptyTitle}>No pending invitations</Text>
          <Text style={styles.emptyText}>
            When someone invites you to a vault, it shows up here for you to accept or decline.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Caption>Pending invitations</Caption>

          {invitations.map((invitation) => (
            <View key={invitation.id} style={styles.card}>
              <View style={styles.cardRow}>
                <Avatar
                  uri={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                    invitation.inviterName ?? invitation.inviterId
                  }`}
                  size={44}
                  borderWidth={1}
                />
                <View style={styles.cardInfo}>
                  <Text style={styles.albumTitle} numberOfLines={1}>
                    {invitation.albumTitle ?? 'Shared vault'}
                  </Text>
                  <Text style={styles.inviter} numberOfLines={1}>
                    Invited by {invitation.inviterName ?? 'a friend'}
                  </Text>
                  <Text style={styles.date}>
                    {invitation.createdAt
                      ? format(new Date(invitation.createdAt), 'MMMM d, yyyy')
                      : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => decline(invitation)}
                  style={[styles.actionButton, styles.declineButton]}
                >
                  <X width={14} height={14} color={colors.charcoal} />
                  <Text style={[styles.actionText, styles.declineText]}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => accept(invitation)}
                  style={[styles.actionButton, styles.acceptButton]}
                >
                  <Check width={14} height={14} color={colors.white} />
                  <Text style={[styles.actionText, styles.acceptText]}>Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
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
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.beige,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontStyle: 'italic',
    color: colors.charcoal,
    marginTop: 16,
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(45,45,45,0.5)',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 64,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(45,45,45,0.05)',
    padding: 18,
    marginTop: 14,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardInfo: { flex: 1 },
  albumTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontStyle: 'italic',
    color: colors.charcoal,
    marginBottom: 2,
  },
  inviter: {
    fontSize: 12,
    color: 'rgba(45,45,45,0.55)',
    marginBottom: 3,
  },
  date: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: radius.md,
  },
  declineButton: {
    backgroundColor: colors.beige,
  },
  acceptButton: {
    backgroundColor: colors.charcoal,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  declineText: { color: colors.charcoal },
  acceptText: { color: colors.white },
});

