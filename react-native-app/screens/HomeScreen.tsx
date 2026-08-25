import React, { useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import { format } from 'date-fns';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import type { RootStackParamList } from '../App';
import { useFirebase } from '../lib/FirebaseProvider';
import { resolveAssetUrl } from '../lib/config';
import { colors, radius } from '../lib/theme';
import { Avatar, Caption, FloatingNav } from '../lib/ui';
import type { Album } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 18) return 'Good afternoon,';
  return 'Good evening,';
}

export default function HomeScreen({ navigation }: Props) {
  const { user, albums, refreshAlbums } = useFirebase();

  // Re-fetch albums whenever Home regains focus (e.g. after creating a vault).
  useFocusEffect(
    useCallback(() => {
      void refreshAlbums();
    }, [refreshAlbums])
  );

  const openAlbum = (album: Album) =>
    navigation.navigate('AlbumDetail', { albumId: album.id });

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, styles.headerSafe]}>
        <View>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.userName}>
            {user?.displayName?.split(' ')[0] ?? 'Friend'}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Profile')}
          style={styles.avatarButton}
        >
          <Avatar uri={user?.photoURL} size={48} />
        </TouchableOpacity>
      </View>

      {/* Album list */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionRow}>
          <Caption>Your Memories</Caption>
          <TouchableOpacity
            hitSlop={12}
            onPress={() => navigation.navigate('CreateAlbum')}
          >
            <Plus width={20} height={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {albums.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No vaults yet</Text>
            <Text style={styles.emptyBody}>
              Tap the + button below to create your first shared memory vault.
            </Text>
          </View>
        )}

        {albums.map((album) => (
          <TouchableOpacity
            key={album.id}
            activeOpacity={0.9}
            onPress={() => openAlbum(album)}
            style={styles.cardWrap}
          >
            {/* Book-stack effect */}
            <View
              style={[
                styles.stackLayer,
                { transform: [{ translateX: 8 }, { translateY: 8 }] },
              ]}
            />
            <View
              style={[
                styles.stackLayer,
                { transform: [{ translateX: 4 }, { translateY: 4 }] },
              ]}
            />

            <View style={styles.card}>
              <Image
                source={{ uri: resolveAssetUrl(album.coverPhotoURL) }}
                style={styles.coverImage}
              />
              <View style={styles.coverGradientFallback} />
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {album.title}
                </Text>
                <Text style={styles.cardMeta}>
                  {format(new Date(album.eventDate), 'MMM d, yyyy')} •{' '}
                  {album.photoCount} Moments
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FloatingNav
        active="home"
        onHome={() => {}}
        onCreate={() => navigation.navigate('CreateAlbum')}
        onProfile={() => navigation.navigate('Profile')}
      />
    </View>
  );
}

const CARD_ASPECT = 4 / 5;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  headerSafe: { paddingTop: 60 },
  header: {
    paddingHorizontal: 32,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 22,
    color: colors.charcoal,
    fontWeight: '500',
  },
  userName: {
    fontSize: 26,
    fontStyle: 'italic',
    fontWeight: '600',
    color: colors.peach,
  },
  avatarButton: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 140,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    marginHorizontal: 8,
  },
  cardWrap: {
    marginBottom: 36,
    position: 'relative',
  },
  stackLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45,45,45,0.06)',
    borderRadius: 40,
  },
  card: {
    borderRadius: 40,
    overflow: 'hidden',
    aspectRatio: CARD_ASPECT,
    backgroundColor: '#EDE9E1',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  coverImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  coverGradientFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45,45,45,0.28)',
  },
  cardInfo: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 28,
  },
  cardTitle: {
    color: colors.white,
    fontSize: 24,
    fontStyle: 'italic',
    fontWeight: '600',
    lineHeight: 30,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  cardMeta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontStyle: 'italic',
    color: colors.charcoal,
    marginBottom: 10,
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
    textAlign: 'center',
  },
});