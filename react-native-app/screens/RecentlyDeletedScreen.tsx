import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { ChevronLeft, RotateCcw, Trash2 } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../App';
import { useFirebase } from '../lib/FirebaseProvider';
import { photosApi } from '../lib/api/endpoints';
import { resolveAssetUrl } from '../lib/config';
import { colors, radius } from '../lib/theme';
import { Spinner } from '../lib/ui';
import type { Photo } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RecentlyDeleted'>;

const GRACE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days left before the photo is permanently removed (0 = less than a day). */
function daysLeft(deletedAt?: string): number {
  if (!deletedAt) return GRACE_DAYS;
  const elapsed = Date.now() - new Date(deletedAt).getTime();
  if (Number.isNaN(elapsed)) return GRACE_DAYS;
  return Math.max(0, Math.ceil((GRACE_DAYS * DAY_MS - elapsed) / DAY_MS));
}

export default function RecentlyDeletedScreen({ route, navigation }: Props) {
  const { albumId, albumOwnerId } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useFirebase();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  // The uploader or the album creator may restore (the server enforces the
  // same rule). `albumOwnerId` comes from the album screen via route params,
  // so it is always available here.
  const canRestore = (photo: Photo) =>
    !!user &&
    (user.userId === photo.uploaderId || user.userId === albumOwnerId);

  // Refetch on every focus so restoring a photo removes it from this list
  // right away.
  const load = useCallback(async () => {
    try {
      setPhotos(await photosApi.list(albumId, { deleted: true }));
    } catch (error) {
      console.warn('Failed to load recently deleted photos:', error);
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const restorePhoto = async (photo: Photo) => {
    try {
      await photosApi.restore(photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      Alert.alert('Photo restored', 'The photo is back in the album.');
    } catch (error) {
      console.warn('Failed to restore photo:', error);
      Alert.alert(
        'Could not restore photo',
        error instanceof Error ? error.message : 'Please try again.'
      );
    }
  };

  const confirmRestore = (photo: Photo) => {
    Alert.alert('Restore this photo?', 'It will reappear in the album for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', onPress: () => void restorePhoto(photo) },
    ]);
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
          <Text style={styles.title}>Recently deleted</Text>
          <Text style={styles.subtitle}>
            Kept for 7 days, then permanently removed.
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Spinner />
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Trash2 width={26} height={26} color={colors.peach} />
          </View>
          <Text style={styles.emptyTitle}>No photos in the trash</Text>
          <Text style={styles.emptyText}>
            Deleted photos appear here for 7 days so they can be brought back.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            {photos.map((photo, pIndex) => {
              const left = daysLeft(photo.deletedAt);
              return (
                <View
                  key={photo.id}
                  style={[
                    styles.cell,
                    pIndex % 3 === 0 ? styles.cellTall : styles.cellShort,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.cellTouch}
                    activeOpacity={0.9}
                    onPress={() =>
                      navigation.navigate('PhotoViewer', {
                        photo,
                        albumOwnerId,
                        isDeleted: true,
                      })
                    }
                  >
                    <Image
                      source={{ uri: resolveAssetUrl(photo.url) }}
                      style={styles.image}
                    />
                    <View style={styles.dim} />
                  </TouchableOpacity>
                  <View style={styles.chip} pointerEvents="none">
                    <Trash2 width={10} height={10} color={colors.white} />
                    <Text style={styles.chipText}>
                      {`TRASH · ${left >= 1 ? `${left}d` : '<1d'} left`}
                    </Text>
                  </View>
                  {canRestore(photo) && (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => confirmRestore(photo)}
                      style={styles.restoreBar}
                    >
                      <RotateCcw width={13} height={13} color={colors.charcoal} />
                      <Text style={styles.restoreBarText}>Restore</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
          <Text style={styles.hint}>
            {'Tap a photo to view it. Restore is available to the photo owner or the album creator.'}
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
  headerText: {
    flex: 1,
  },
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cell: {
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
  cellTall: { height: 240 },
  cellShort: { height: 180 },
  cellTouch: { flex: 1 },
  image: { width: '100%', height: '100%' },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45,45,45,0.45)',
  },
  chip: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  chipText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  restoreBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.peach,
  },
  restoreBarText: {
    color: colors.charcoal,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  hint: {
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(45,45,45,0.4)',
  },
});
