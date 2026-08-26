import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../App';
import { useFirebase } from '../lib/FirebaseProvider';
import { albumsApi, photosApi, uploadsApi } from '../lib/api/endpoints';
import { detectImageTone } from '../lib/imageTone';
import { resolveAssetUrl } from '../lib/config';
import { colors, radius } from '../lib/theme';
import { Avatar, Caption, Spinner } from '../lib/ui';
import type { Album, Photo } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AlbumDetail'>;

const HEADER_HEIGHT = 460;

/** One photo cell inside a virtualized grid row (pattern flags precomputed). */
interface PhotoCellData {
  photo: Photo;
  tall: boolean;
  offsetDown: boolean;
}

type GridItem =
  | { kind: 'header'; label: string }
  | { kind: 'row'; cells: PhotoCellData[]; sectionEnd: boolean };

export default function AlbumDetailScreen({ route, navigation }: Props) {
  const { albumId } = route.params;
  const { user, albums, refreshAlbums } = useFirebase();
  const album: Album | undefined = albums.find((a) => a.id === albumId);
  const insets = useSafeAreaInsets();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [deletedPhotos, setDeletedPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch photos from the backend each time the screen gains focus (covers
  // returning from Upload / Camera / PhotoViewer) and on first mount.
  const loadPhotos = useCallback(async () => {
    try {
      const [list, deleted] = await Promise.all([
        photosApi.list(albumId),
        photosApi.list(albumId, { deleted: true }),
      ]);
      setPhotos(list);
      setDeletedPhotos(deleted);
    } catch (error) {
      console.warn('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useFocusEffect(
    useCallback(() => {
      // Refetch on focus WITHOUT blanking the list. Swapping in a spinner
      // collapses the scroll content, clamps the offset to the top, and can
      // leave the first scroll gestures dead after returning from a viewer.
      // A silent refresh keeps the grid mounted and scrollable throughout.
      void loadPhotos();
    }, [loadPhotos])
  );

  // Collapsing hero header: as you scroll, the whole header (cover + overlays)
  // slides up and fades out — a vertical-only contraction (width stays full).
  // The image is NEVER resized or scaled; it is only clipped by the header,
  // so the cover can't be distorted. The photo list fills the space.
  const scrollY = useRef(new Animated.Value(0)).current;
  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT],
    extrapolate: 'clamp',
  });
  const heroOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT * 0.45, HEADER_HEIGHT],
    outputRange: [1, 0.6, 0],
    extrapolate: 'clamp',
  });

  const openMoreMenu = () => {
    const options: Array<{
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }> = [
      {
        text: 'Invite loved ones',
        onPress: () => navigation.navigate('Invite', { albumId }),
      },
      {
        text: 'Memory recap',
        onPress: () => navigation.navigate('Recap', { albumId }),
      },
    ];

    // Only show the trash entry when there is something to restore.
    if (album && deletedPhotos.length > 0) {
      options.push({
        text:
          deletedPhotos.length > 1
            ? `Recently deleted (${deletedPhotos.length})`
            : 'Recently deleted',
        onPress: () =>
          navigation.navigate('RecentlyDeleted', {
            albumId,
            albumOwnerId: album.ownerId,
          }),
      });
    }

    // Changing the cover is an owner action (enforced server-side too).
    if (album && user && album.ownerId === user.userId) {
      options.push({
        text: 'Change cover photo',
        onPress: () => void changeCover(),
      });
    }

    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Vault actions', undefined, options);
  };

  /** Picks a new cover, uploads it, and updates the album. */
  const changeCover = async () => {
    if (!album) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.uri) return;

      // Stream the chosen image to the backend, then point the album at it.
      const url = await uploadsApi.uploadFile({
        uri: asset.uri,
        name: asset.fileName ?? 'cover.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      });
      // Detect dark/light so the title stays readable on the new cover.
      const coverTone = await detectImageTone(asset.uri);

      await albumsApi.update(album.id, { coverPhotoURL: url, coverTone });
      await refreshAlbums();

      Alert.alert('Cover updated', 'Your new cover photo is live.');
    } catch (error) {
      console.warn('Failed to update cover:', error);
      Alert.alert(
        'Could not update cover',
        error instanceof Error ? error.message : 'Please try again.'
      );
    }
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

  // Virtualized timeline: section headers + rows of 2 photo cells. Chunking the
  // grid into rows lets the FlatList recycle off-screen rows (large albums stay
  // smooth and low-memory instead of mounting every image at once).
  const gridItems = useMemo<GridItem[]>(() => {
    const items: GridItem[] = [];
    for (const [label, sectionPhotos] of sections) {
      items.push({ kind: 'header', label });
      for (let i = 0; i < sectionPhotos.length; i += 2) {
        const cells = sectionPhotos.slice(i, i + 2).map((photo, j) => {
          const pIndex = i + j;
          return {
            photo,
            tall: pIndex % 3 === 0,
            offsetDown: pIndex % 4 === 1,
          };
        });
        items.push({
          kind: 'row',
          cells,
          sectionEnd: i + 2 >= sectionPhotos.length,
        });
      }
    }
    return items;
  }, [sections]);

  const keyForGridItem = useCallback(
    (item: GridItem) =>
      item.kind === 'header'
        ? `header-${item.label}`
        : `row-${item.cells[0]?.photo.id ?? 'x'}`,
    []
  );

  const renderGridItem = useCallback(
    ({ item }: { item: GridItem }) => {
      if (item.kind === 'header') {
        return (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Caption>{item.label}</Caption>
            </View>
          </View>
        );
      }
      return (
        <View style={[styles.gridRow, item.sectionEnd && styles.gridRowSectionEnd]}>
          {item.cells.map((cell) => (
            <TouchableOpacity
              key={cell.photo.id}
              activeOpacity={0.92}
              onPress={() =>
                navigation.navigate('PhotoViewer', {
                  photos,
                  initialIndex: photos.indexOf(cell.photo),
                  albumOwnerId: album?.ownerId,
                })
              }
              style={[
                styles.photoCell,
                cell.tall ? styles.photoCellTall : styles.photoCellShort,
                cell.offsetDown && styles.photoCellOffset,
              ]}
            >
              <Image
                source={{ uri: resolveAssetUrl(cell.photo.url) }}
                style={styles.photoImage}
              />
              {(cell.photo.reactions?.heart ?? 0) > 0 && (
                <View style={styles.reactionChip}>
                  <Heart width={10} height={10} color={colors.white} fill={colors.white} />
                  <Text style={styles.reactionCount}>{cell.photo.reactions.heart}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      );
    },
    [photos, navigation, album]
  );

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

  // Dark covers get light text + a bottom scrim; light covers keep the
  // original cream gradient + charcoal text.
  const isDarkCover = album.coverTone !== 'light';

  return (
    <View style={styles.root}>
      {/* Collapsing hero header — pinned at top; contracts vertically + fades */}
      {/* `box-none` / `none` make it a pass-through overlay: taps fall through
          to the photo grid (except on the actual header buttons), so photos
          scrolled up under the hero are still tappable. */}
      <View style={styles.headerWrap} pointerEvents="box-none">
        <Animated.View
          pointerEvents="box-none"
          style={[
            StyleSheet.absoluteFillObject,
            { transform: [{ translateY: heroTranslateY }], opacity: heroOpacity },
          ]}
        >
          <Image
            source={{ uri: resolveAssetUrl(album.coverPhotoURL) }}
            style={styles.headerImage}
          />
          <LinearGradient
            pointerEvents="none"
            colors={
              isDarkCover
                ? ['rgba(253,251,247,0)', 'rgba(45,45,45,0.4)', 'rgba(45,45,45,0.8)']
                : ['rgba(253,251,247,1)', 'rgba(45,45,45,0.25)', 'rgba(45,45,45,0)']
            }
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFillObject}
          />

        {/* Top controls */}
        <View
          style={[styles.topControls, { paddingTop: insets.top + 8 }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
            style={styles.glassButton}
          >
            <ChevronLeft width={24} height={24} color={colors.white} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }} pointerEvents="box-none">
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
        <View style={styles.heroInfo} pointerEvents="box-none">
          <Text
            pointerEvents="none"
            style={[styles.heroTitle, isDarkCover && styles.heroTitleDark]}
          >
            {album.title}
          </Text>
          <Text
            pointerEvents="none"
            style={[styles.heroDate, isDarkCover && styles.heroDateDark]}
          >
            {format(new Date(album.eventDate), 'MMMM d, yyyy')}
          </Text>

          <View style={styles.heroRow} pointerEvents="box-none">
            <View style={styles.membersRow} pointerEvents="box-none">
              {album.members.slice(0, 5).map((member, i) => (
                <View
                  key={`${member}-${i}`}
                  pointerEvents="none"
                  style={{ marginLeft: i === 0 ? 0 : -12 }}
                >
                  <Avatar
                    uri={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member}`}
                    size={40}
                    borderWidth={2}
                  />
                </View>
              ))}
              {album.members.length > 5 && (
                <View style={styles.memberOverflow} pointerEvents="none">
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
        </Animated.View>
      </View>

      {/* Timeline content — virtualized photo grid under the collapsing hero */}
      <Animated.FlatList
        contentContainerStyle={styles.timelineContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        data={gridItems}
        keyExtractor={keyForGridItem}
        renderItem={renderGridItem}
        ListHeaderComponent={<View style={styles.sheetHandle} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingWrap}>
              <Spinner />
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
                {'Every memory starts with a single photo.\nTap the button below to add yours.'}
              </Text>
            </View>
          )
        }
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={11}
      />

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
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    pointerEvents: 'none',
  },
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
  heroTitleDark: {
    color: colors.white,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  heroDate: {
    fontSize: 13,
    fontStyle: 'italic',
    fontWeight: '500',
    color: 'rgba(45,45,45,0.6)',
    marginBottom: 28,
  },
  heroDateDark: {
    color: 'rgba(255,255,255,0.8)',
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
    paddingTop: HEADER_HEIGHT,
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
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridRowSectionEnd: {
    // cell margin (16) + the old `.section` bottom margin (56) — faithful to
    // the pre-virtualization layout.
    marginBottom: 72,
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