import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Share2,
  MoreVertical,
  Plus,
  Sparkles,
  Camera,
  Upload,
  Heart,
} from 'lucide-react-native';
import { format } from 'date-fns';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import type { RootStackParamList } from '../App';
import { useFirebase } from '../lib/FirebaseProvider';
import { photosApi } from '../lib/api/endpoints';
import { resolveAssetUrl } from '../lib/config';
import { colors, radius } from '../lib/theme';
import { Avatar, Caption, Spinner } from '../lib/ui';
import type { Album, Photo } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AlbumDetail'>;

const HEADER_HEIGHT = 460;
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function AlbumDetailScreen({ route, navigation }: Props) {
  const { albumId } = route.params;
  const { albums } = useFirebase();
  const album: Album | undefined = albums.find((a) => a.id === albumId);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch photos from the backend each time the screen gains focus (covers
  // returning from Upload / Camera / PhotoViewer) and on first mount.
  const loadPhotos = useCallback(async () => {
    try {
      const list = await photosApi.list(albumId);
      setPhotos(list);
    } catch (error) {
      console.warn('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadPhotos();
    }, [loadPhotos])
  );

  // Scroll-driven parallax on the hero header.
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, HEADER_HEIGHT * 0.35],
    extrapolateRight: 'extend',
  });
  const headerScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.15, 1],
    extrapolateLeft: 'extend',
  });

  const openMoreMenu = () => {
    Alert.alert('Vault actions', undefined, [
      {
        text: 'Invite loved ones',
        onPress: () => navigation.navigate('Invite', { albumId }),
      },
      {
        text: 'Memory recap',
        onPress: () => navigation.navigate('Recap', { albumId }),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Group photos by timestampLabel.
  const sections = useMemo(() => {
    const grouped: Record<string, Photo[]> = {};
    for (const photo of photos) {
      const label = photo.timestampLabel || 'Moments';
      (grouped[label] ??= []).push(photo);
    }
    return Object.entries(grouped);
  }, [photos]);

  if (!album) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.missingTitle}>Vault not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.missingLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Immersive parallax header */}
      <View style={styles.headerWrap}>
        <Animated.View
          style={[
            styles.headerImageWrap,
            { transform: [{ translateY: headerTranslateY }, { scale: headerScale }] },
          ]}
        >
          <Image
            source={{ uri: album.coverPhotoURL }}
            style={styles.headerImage}
          />
          <LinearGradient
            colors={['rgba(253,251,247,1)', 'rgba(45,45,45,0.25)', 'rgba(45,45,45,0)']}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        {/* Top controls */}
        <View style={[styles.topControls, styles.topControlsSafe]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
            style={styles.glassButton}
          >
            <ChevronLeft width={24} height={24} color={colors.white} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Invite', { albumId })}
              style={styles.glassButton}
            >
              <Share2 width={20} height={20} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={openMoreMenu}
              style={styles.glassButton}
            >
              <MoreVertical width={20} height={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero info */}
        <View style={styles.heroInfo}>
          <Text style={styles.heroTitle}>{album.title}</Text>
          <Text style={styles.heroDate}>
            {format(new Date(album.eventDate), 'MMMM d, yyyy')}
          </Text>

          <View style={styles.heroRow}>
            <View style={styles.membersRow}>
              {album.members.slice(0, 5).map((member, i) => (
                <View key={`${member}-${i}`} style={{ marginLeft: i === 0 ? 0 : -12 }}>
                  <Avatar
                    uri={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member}`}
                    size={40}
                    borderWidth={2}
                  />
                </View>
              ))}
              {album.members.length > 5 && (
                <View style={styles.memberOverflow}>
                  <Text style={styles.memberOverflowText}>
                    +{album.members.length - 5}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Invite', { albumId })}
                style={styles.addMemberButton}
              >
                <Plus width={20} height={20} color={colors.white} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => navigation.navigate('Recap', { albumId })}
              style={styles.recapButton}
            >
              <Sparkles width={16} height={16} color={colors.peach} fill={colors.peach} />
              <Text style={styles.recapButtonText}>Memory Recap</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Timeline content */}
      <Animated.ScrollView
        contentContainerStyle={styles.timelineContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.sheetHandle} />

        {loading ? (
          <View style={styles.loadingWrap}>
            <Spinner />
          </View>
        ) : photos.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              {'Every memory starts with a single photo.\nTap the button below to add yours.'}
            </Text>
          </View>
        ) : (
          sections.map(([label, sectionPhotos]) => (
            <View key={label} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionBadge}>
                  <Caption>{label}</Caption>
                </View>
              </View>

              <View style={styles.grid}>
                {sectionPhotos.map((photo, pIndex) => {
                  const tall = pIndex % 3 === 0;
                  const offsetDown = pIndex % 4 === 1;
                  return (
                    <TouchableOpacity
                      key={photo.id}
                      activeOpacity={0.92}
                      onPress={() =>
                        navigation.navigate('PhotoViewer', { photo })
                      }
                      style={[
                        styles.photoCell,
                        tall ? styles.photoCellTall : styles.photoCellShort,
                        offsetDown && styles.photoCellOffset,
                      ]}
                    >
                      <Image source={{ uri: resolveAssetUrl(photo.url) }} style={styles.photoImage} />
                      {(photo.reactions?.heart ?? 0) > 0 && (
                        <View style={styles.reactionChip}>
                          <Heart width={10} height={10} color={colors.white} fill={colors.white} />
                          <Text style={styles.reactionCount}>
                            {photo.reactions.heart}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </Animated.ScrollView>

      {/* Floating action buttons */}
      <View style={styles.fabColumn}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Upload', { albumId })}
          style={styles.fabSmall}
        >
          <Upload width={20} height={20} color={colors.charcoal} />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Camera', { albumId })}
          style={styles.fabLarge}
        >
          <Camera width={30} height={30} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  center: { alignItems: 'center', justifyContent: 'center' },
  missingTitle: {
    fontSize: 22,
    fontStyle: 'italic',
    color: colors.charcoal,
    marginBottom: 12,
  },
  missingLink: { color: colors.peach, fontWeight: '700' },

  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    zIndex: 1,
    overflow: 'hidden',
  },
  headerImageWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  headerImage: {
    width: SCREEN_WIDTH,
    height: HEADER_HEIGHT,
    resizeMode: 'cover',
  },
  topControlsSafe: { paddingTop: 56 },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 3,
  },
  glassButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    position: 'absolute',
    left: 32,
    right: 32,
    bottom: 44,
    zIndex: 2,
  },
  heroTitle: {
    fontSize: 40,
    lineHeight: 46,
    fontStyle: 'italic',
    fontWeight: '600',
    color: colors.charcoal,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroDate: {
    fontSize: 13,
    fontStyle: 'italic',
    fontWeight: '500',
    color: 'rgba(45,45,45,0.6)',
    marginBottom: 28,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberOverflow: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    marginLeft: -12,
    backgroundColor: colors.beige,
    borderWidth: 2,
    borderColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberOverflowText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.charcoal,
  },
  addMemberButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    marginLeft: -12,
    backgroundColor: colors.peach,
    borderWidth: 2,
    borderColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: radius.md,
    backgroundColor: colors.charcoal,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  recapButtonText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  timelineContent: {
    paddingTop: HEADER_HEIGHT - 40,
    paddingHorizontal: 24,
    paddingBottom: 140,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(45,45,45,0.08)',
    marginBottom: 28,
  },
  loadingWrap: { paddingVertical: 40, alignItems: 'center' },
  emptyWrap: { paddingVertical: 72, alignItems: 'center' },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(45,45,45,0.4)',
  },
  section: { marginBottom: 56 },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 26,
  },
  sectionBadge: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.beige,
    borderWidth: 1,
    borderColor: 'rgba(45,45,45,0.05)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoCell: {
    width: '48%',
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#EDE9E1',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  photoCellTall: { height: 240 },
  photoCellShort: { height: 180 },
  photoCellOffset: { marginTop: 28 },
  photoImage: { width: '100%', height: '100%' },
  reactionChip: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  reactionCount: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },

  fabColumn: {
    position: 'absolute',
    right: 28,
    bottom: 36,
    alignItems: 'flex-end',
    gap: 14,
    zIndex: 5,
  },
  fabSmall: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabLarge: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
});