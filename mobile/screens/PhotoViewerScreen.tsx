import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  ScrollView,
  Animated,
  PanResponder,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronLeft,
  Heart,
  MessageCircle,
  MoreHorizontal,
  RotateCcw,
  Share2,
  Trash2,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../App';
import { photosApi } from '../lib/api/endpoints';
import { resolveAssetUrl } from '../lib/config';
import { useFirebase } from '../lib/FirebaseProvider';
import { colors, radius } from '../lib/theme';
import { Avatar } from '../lib/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'PhotoViewer'>;

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

export default function PhotoViewerScreen({ route, navigation }: Props) {
  const { photos, initialIndex, albumOwnerId, isDeleted: isDeletedParam } = route.params;
  const insets = useSafeAreaInsets();
  const { width: pageWidth, height: windowHeight } = useWindowDimensions();
  const { user } = useFirebase();

  const [index, setIndex] = useState(() =>
    photos.length === 0 ? 0 : clamp(initialIndex ?? 0, 0, photos.length - 1)
  );
  const [liked, setLiked] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const dismissProgress = useRef(new Animated.Value(0)).current;

  const photo = photos[index];
  const canModerate =
    !!user && !!photo && (user.userId === photo.uploaderId || user.userId === albumOwnerId);
  // Trash screens pass `isDeleted` explicitly, so restore still works even if
  // an older backend doesn't serialize `deletedAt`.
  const isDeleted = isDeletedParam ?? !!photo?.deletedAt;

  // Reset per-photo UI state when the user pages to another photo.
  useEffect(() => {
    setLiked(false);
  }, [photo?.id]);

  /** Snaps the current page index after a swipe settles on a photo. */
  const onPageSettled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (photos.length === 0 || pageWidth <= 0) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    setIndex(clamp(next, 0, photos.length - 1));
  };

  const pagerRef = useRef<ScrollView>(null);

  // Ensure the pager opens on the tapped photo even on platforms where the
  // ScrollView ignores the `contentOffset` prop on first render.
  useEffect(() => {
    const x = (initialIndex ?? 0) * pageWidth;
    pagerRef.current?.scrollTo({ x, y: 0, animated: false });
  }, [initialIndex, pageWidth]);

  // Swipe-down to dismiss: drags the whole viewer down. Releasing past the
  // threshold (or a fast downward fling) pops the screen; otherwise it springs
  // back into place.
  const dismiss = useCallback(() => {
    setDismissing(true);
    Animated.timing(dismissProgress, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start(() => navigation.goBack());
  }, [dismissProgress, navigation]);

  const resetDismiss = useCallback(() => {
    Animated.spring(dismissProgress, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 24,
    }).start();
  }, [dismissProgress]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Only claim clearly-vertical downward drags; horizontal swipes are
        // left to the paging ScrollView.
        onMoveShouldSetPanResponder: (_, g) =>
          !dismissing && g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx) * 1.25,
        onPanResponderMove: (_, g) => {
          if (g.dy < 0) return;
          dismissProgress.setValue(Math.min(1, g.dy / (windowHeight * 0.3)));
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 90 || g.vy > 0.8) dismiss();
          else resetDismiss();
        },
        onPanResponderTerminate: resetDismiss,
      }),
    [dismissing, windowHeight, dismissProgress, dismiss, resetDismiss]
  );

  const translateY = dismissProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, windowHeight],
  });
  const containerOpacity = dismissProgress.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 0.9, 0.5],
  });

  if (!photo || photos.length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <View style={[styles.topControls, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
            style={styles.glassButton}
          >
            <ChevronLeft width={24} height={24} color={colors.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No photo to show.</Text>
        </View>
      </View>
    );
  }

  const toggleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    try {
      await photosApi.react(photo.id, newLiked ? 1 : -1);
    } catch (error) {
      console.warn('Failed to update reaction:', error);
      setLiked(!newLiked); // Revert on failure.
    }
  };

  const sharePhoto = async () => {
    const shareUrl = resolveAssetUrl(photo.url);
    try {
      await Share.share({
        message: photo.caption
          ? `"${photo.caption}" — shared in Kindred`
          : 'A shared moment from Kindred',
        url: shareUrl?.startsWith('http') ? shareUrl : undefined,
      });
    } catch {
      // User cancelled.
    }
  };

  const showMore = () => {
    const options: Array<{
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }> = [{ text: 'Share photo', onPress: sharePhoto }];

    if (canModerate && isDeleted) {
      options.push({ text: 'Restore photo', onPress: confirmRestore });
    } else if (canModerate) {
      options.push({ text: 'Delete photo', style: 'destructive', onPress: confirmDelete });
    }
    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(photo.uploaderName, photo.timestampLabel || 'Shared moment', options);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete this photo?',
      'It moves to the album trash and is permanently removed after 7 days. You can restore it anytime before then.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void deletePhoto() },
      ]
    );
  };

  const deletePhoto = async () => {
    try {
      await photosApi.remove(photo.id);
      navigation.goBack();
    } catch (error) {
      console.warn('Failed to delete photo:', error);
      Alert.alert(
        'Could not delete photo',
        error instanceof Error ? error.message : 'Please try again.'
      );
    }
  };

  const confirmRestore = () => {
    Alert.alert('Restore this photo?', 'It will reappear in the album for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', onPress: () => void restorePhoto() },
    ]);
  };

  const restorePhoto = async () => {
    try {
      await photosApi.restore(photo.id);
      navigation.goBack();
    } catch (error) {
      console.warn('Failed to restore photo:', error);
      Alert.alert(
        'Could not restore photo',
        error instanceof Error ? error.message : 'Please try again.'
      );
    }
  };

  return (
    <Animated.View
      style={[styles.root, { transform: [{ translateY }], opacity: containerOpacity }]}
      {...panResponder.panHandlers}
    >
      <StatusBar style="light" />

      {/* Page counter */}
      {photos.length > 1 && (
        <View style={[styles.counterBadge, { top: insets.top + 56 }]} pointerEvents="none">
          <Text style={styles.counterText}>
            {index + 1} / {photos.length}
          </Text>
        </View>
      )}

      {/* Top controls */}
      <View style={[styles.topControls, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
          style={styles.glassButton}
        >
          <ChevronLeft width={24} height={24} color={colors.white} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={sharePhoto}
            style={styles.glassButton}
          >
            <Share2 width={18} height={18} color={colors.white} />
          </TouchableOpacity>
          {canModerate && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={isDeleted ? confirmRestore : confirmDelete}
              style={styles.glassButton}
            >
              {isDeleted ? (
                <RotateCcw width={18} height={18} color={colors.peach} />
              ) : (
                <Trash2 width={18} height={18} color={colors.white} />
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={showMore}
            style={styles.glassButton}
          >
            <MoreHorizontal width={20} height={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Trash badge for photos in the 7-day grace window */}
      {isDeleted && (
        <View
          style={[styles.deletedBadge, { top: insets.top + (photos.length > 1 ? 94 : 66) }]}
          pointerEvents="none"
        >
          <Text style={styles.deletedBadgeText}>IN TRASH — RESTORES FOR 7 DAYS</Text>
        </View>
      )}

      {/* Paged photos — swipe left/right to browse */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!dismissing}
        onMomentumScrollEnd={onPageSettled}
        contentOffset={{ x: initialIndex * pageWidth, y: 0 }}
        style={styles.pager}
      >
        {photos.map((p, i) => (
          <View key={p.id} style={[styles.page, { width: pageWidth }]}>
            {Math.abs(i - index) <= 2 ? (
              <Image
                source={{ uri: resolveAssetUrl(p.url) }}
                style={styles.image}
                resizeMode="contain"
              />
            ) : null}
          </View>
        ))}
      </ScrollView>

      {/* Footer info */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.85)']}
        style={[styles.footerGradient, { paddingBottom: insets.bottom + 24 }]}
        pointerEvents="box-none"
      >
        <View style={styles.footer}>
          <View style={styles.uploaderRow}>
            <Avatar
              uri={`https://api.dicebear.com/7.x/avataaars/svg?seed=${photo.uploaderName}`}
              size={40}
              borderWidth={1}
              borderColor="rgba(255,255,255,0.25)"
            />
            <View>
              <Text style={styles.uploaderName}>{photo.uploaderName}</Text>
              <Text style={styles.uploaderMeta}>
                {(photo.timestampLabel || 'Shared moment').toUpperCase()}
              </Text>
            </View>
          </View>

          {!!photo.caption && (
            <Text style={styles.caption}>"{photo.caption}"</Text>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={toggleLike}
              style={styles.actionItem}
            >
              <Heart
                width={24}
                height={24}
                color={liked ? colors.peach : colors.white}
                fill={liked ? colors.peach : 'transparent'}
              />
              <Text style={styles.actionCount}>
                {(photo.reactions?.heart ?? 0) + (liked ? 1 : 0)}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionItem}>
              <MessageCircle width={24} height={24} color={colors.white} />
              <Text style={styles.actionCount}>0</Text>
            </View>

            <View style={{ flex: 1 }} />

            {isDeleted && canModerate ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={confirmRestore}
                style={styles.restoreFab}
              >
                <RotateCcw width={16} height={16} color={colors.charcoal} />
                <Text style={styles.restoreFabText}>Restore</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={sharePhoto}
                style={styles.shareFab}
              >
                <Text style={styles.shareFabText}>Share</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.charcoal,
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  glassButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletedBadge: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 5,
  },
  deletedBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(45,45,45,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  pager: {
    flex: 1,
  },
  page: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  counterBadge: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 6,
  },
  counterText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(45,45,45,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontStyle: 'italic',
  },
  footerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  footer: {
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  uploaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  uploaderName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  uploaderMeta: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    letterSpacing: 2,
  },
  caption: {
    color: 'rgba(241,236,225,0.9)',
    fontSize: 15,
    lineHeight: 23,
    fontStyle: 'italic',
    marginBottom: 26,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionCount: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  shareFab: {
    backgroundColor: colors.white,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  shareFabText: {
    color: colors.charcoal,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  restoreFab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.peach,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  restoreFabText: {
    color: colors.charcoal,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});