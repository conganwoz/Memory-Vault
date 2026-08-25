import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ChevronLeft, Mail, RotateCcw, Send, Users } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../App';
import { useFirebase } from '../lib/FirebaseProvider';
import { invitationsApi } from '../lib/api/endpoints';
import { colors, radius } from '../lib/theme';
import { Avatar, Caption, Spinner } from '../lib/ui';
import type { Invitation } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Invite'>;

export default function InviteScreen({ route, navigation }: Props) {
  const { albumId } = route.params;
  const insets = useSafeAreaInsets();
  const { albums } = useFirebase();
  const album = albums.find((a) => a.id === albumId);

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<Invitation[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  // Silent refresh on focus (keeps the list mounted — see AlbumDetail notes).
  const loadPending = useCallback(async () => {
    try {
      setPending(await invitationsApi.listForAlbum(albumId));
    } catch (error) {
      console.warn('Failed to load pending invitations:', error);
    } finally {
      setLoadingPending(false);
    }
  }, [albumId]);

  useFocusEffect(
    useCallback(() => {
      void loadPending();
    }, [loadPending])
  );

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
      console.warn('Failed to send invite:', error);
      setNotice(error instanceof Error ? error.message : 'Could not send the invite.');
    } finally {
      setSending(false);
    }
  };

  const revoke = (invitation: Invitation) => {
    Alert.alert(
      'Revoke invitation?',
      `${invitation.inviteeName ?? 'This person'} will no longer be able to accept it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () =>
            void (async () => {
              try {
                await invitationsApi.revoke(invitation.id);
                setPending((prev) => prev.filter((i) => i.id !== invitation.id));
              } catch (error) {
                console.warn('Failed to revoke invitation:', error);
                Alert.alert(
                  'Could not revoke invitation',
                  error instanceof Error ? error.message : 'Please try again.'
                );
              }
            })(),
        },
      ]
    );
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
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Invite by email */}
          <Caption>Invite by email</Caption>
          <View style={styles.inviteCard}>
            <Text style={styles.inviteHeading}>
              Add a contributor to "{album.title}"
            </Text>
            <Text style={styles.inviteSub}>
              Enter the email of a Kindred account. They'll see the invitation in
              their profile and can accept it to join this vault.
            </Text>

            <View style={styles.inputRow}>
              <Mail width={18} height={18} color={colors.muted} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="friend@example.com"
                placeholderTextColor="rgba(45,45,45,0.35)"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={styles.input}
                returnKeyType="send"
                onSubmitEditing={() => void sendInvite()}
              />
            </View>

            {notice && <Text style={styles.notice}>{notice}</Text>}

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => void sendInvite()}
              disabled={sending}
              style={[styles.sendButton, sending && { opacity: 0.6 }]}
            >
              <Send width={14} height={14} color={colors.white} />
              <Text style={styles.sendButtonText}>
                {sending ? 'Sending…' : 'Send Invite'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Pending invitations */}
          <View style={styles.section}>
            <Caption>Pending invitations</Caption>
            {loadingPending ? (
              <View style={styles.pendingLoading}>
                <Spinner />
              </View>
            ) : pending.length === 0 ? (
              <Text style={styles.pendingEmpty}>
                No one has been invited yet. Invite someone above to start sharing
                memories.
              </Text>
            ) : (
              pending.map((invitation) => (
                <View key={invitation.id} style={styles.pendingRow}>
                  <Avatar
                    uri={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                      invitation.inviteeEmail ?? invitation.inviteeId
                    }`}
                    size={40}
                    borderWidth={1}
                  />
                  <View style={styles.pendingInfo}>
                    <Text style={styles.pendingName} numberOfLines={1}>
                      {invitation.inviteeName ?? invitation.inviteeEmail}
                    </Text>
                    <Text style={styles.pendingMeta} numberOfLines={1}>
                      {invitation.inviteeEmail ?? ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => revoke(invitation)}
                    style={styles.revokeButton}
                  >
                    <RotateCcw width={12} height={12} color={colors.danger} />
                    <Text style={styles.revokeText}>Revoke</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Current contributors */}
          <View style={styles.section}>
            <Caption>Current contributors</Caption>
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  missing: {
    fontSize: 22,
    fontStyle: 'italic',
    color: colors.charcoal,
    marginBottom: 12,
  },
  missingLink: { color: colors.peach, fontWeight: '700' },

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
    fontWeight: '700',
    fontStyle: 'italic',
    color: colors.charcoal,
  },

  scrollContent: {
    paddingHorizontal: 32,
    paddingBottom: 80,
  },

  inviteCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(45,45,45,0.05)',
    padding: 22,
    marginTop: 14,
  },
  inviteHeading: {
    fontSize: 19,
    fontStyle: 'italic',
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 8,
  },
  inviteSub: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(45,45,45,0.55)',
    marginBottom: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.beige,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 14,
    color: colors.charcoal,
  },
  notice: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.peach,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.charcoal,
    paddingVertical: 16,
    borderRadius: radius.md,
  },
  sendButtonText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  section: { marginTop: 36 },
  pendingLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  pendingEmpty: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
    color: 'rgba(45,45,45,0.45)',
    paddingVertical: 12,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(45,45,45,0.05)',
    padding: 14,
    marginTop: 10,
  },
  pendingInfo: { flex: 1 },
  pendingName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 2,
  },
  pendingMeta: {
    fontSize: 12,
    color: 'rgba(45,45,45,0.5)',
  },
  revokeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: '#FEF2F2',
  },
  revokeText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  contributorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
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
    color: colors.charcoal,
  },
});

