import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle } from 'react-native-svg';
import { Animated, Easing } from 'react-native';
import {
  ChevronLeft,
  X,
  Upload as UploadIcon,
  Sparkles,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../App';
import { photosApi } from '../lib/api/endpoints';
import { mapWithConcurrency } from '../lib/api/client';
import { useFirebase } from '../lib/FirebaseProvider';
import { colors, radius } from '../lib/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Upload'>;

const MOMENT_LABELS = [
  'Morning',
  'Ceremony',
  'Afternoon',
  'Dinner',
  'Party',
  'Late Night',
];

interface PickedItem {
  id: string;
  uri: string;
  name?: string;
  type?: string;
}

/**
 * How many photos are uploaded in parallel. Bounded so several uploads run
 * concurrently (fast) while each worker streams one file at a time from disk
 * (low memory).
 */
const MAX_CONCURRENT_UPLOADS = 3;

export default function UploadScreen({ route, navigation }: Props) {
  const { albumId } = route.params;
  const { user } = useFirebase();

  const [items, setItems] = useState<PickedItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Gentle pulse on the sparkle icon while uploading.
  const sparklePulse = useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (!uploading) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sparklePulse, {
          toValue: 1.35,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(sparklePulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [uploading, sparklePulse]);

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.55,
      // NOTE: no `base64` here — we upload the local file via multipart so the
      // image bytes are never buffered into JavaScript memory.
    });
    if (result.canceled) return;

    const picked = result.assets.map((asset, i) => ({
      id: `${asset.assetId ?? asset.uri}-${Date.now()}-${i}`,
      uri: asset.uri,
      name: asset.fileName ?? `photo-${i}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    }));
    setItems((prev) => [...prev, ...picked].slice(0, 10));
  };

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((item) => item.id !== id));

  const handleUpload = async () => {
    if (!user || items.length === 0 || uploading) return;
    setUploading(true);
    setProgress(0);

    const total = items.length;
    let completed = 0;
    const failed: string[] = [];

    // Upload all photos concurrently (bounded pool). Each upload streams the
    // local file via multipart, so memory stays flat regardless of batch size.
    await mapWithConcurrency(items, MAX_CONCURRENT_UPLOADS, async (item) => {
      try {
        await photosApi.uploadFile(albumId, item, {
          timestampLabel:
            MOMENT_LABELS[Math.floor(Math.random() * MOMENT_LABELS.length)],
        });
      } catch (error) {
        console.warn('Upload failed for one photo:', error);
        failed.push(item.uri);
      } finally {
        completed++;
        setProgress(Math.round((completed / total) * 100));
      }
    });

    if (failed.length > 0) {
      Alert.alert(
        'Some moments failed',
        `${failed.length} of ${total} photos could not be uploaded. The rest were saved.`
      );
      setUploading(false);
    } else {
      setTimeout(() => navigation.goBack(), 500);
    }
  };

  // Progress ring geometry.
  const RADIUS = 56;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, styles.headerSafe]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
          disabled={uploading}
          style={styles.backButton}
        >
          <ChevronLeft width={24} height={24} color={colors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Memories</Text>
        <View style={{ width: 40 }} />
      </View>

      {!uploading ? (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Picker drop-zone */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={pickPhotos}
              style={styles.dropZone}
            >
              <View style={styles.dropIconWrap}>
                <UploadIcon width={30} height={30} color={colors.charcoal} />
              </View>
              <Text style={styles.dropTitle}>Tap to pick photos</Text>
              <Text style={styles.dropSubtitle}>High quality photos preferred</Text>
            </TouchableOpacity>

            {items.length > 0 && (
              <View style={{ marginTop: 28 }}>
                <View style={styles.selectedRow}>
                  <Text style={styles.selectedTitle}>
                    Selected ({items.length})
                  </Text>
                  <TouchableOpacity hitSlop={8} onPress={() => setItems([])}>
                    <Text style={styles.clearAll}>Clear all</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.previewGrid}>
                  {items.map((item) => (
                    <View key={item.id} style={styles.previewCell}>
                      <Image source={{ uri: item.uri }} style={styles.previewImage} />
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => removeItem(item.id)}
                        style={styles.removeButton}
                      >
                        <X width={12} height={12} color={colors.white} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleUpload}
              disabled={items.length === 0}
              style={[
                styles.uploadButton,
                items.length === 0 && { opacity: 0.5 },
              ]}
            >
              <Sparkles width={18} height={18} color={colors.peach} fill={colors.peach} />
              <Text style={styles.uploadButtonText}>
                Upload {items.length}{' '}
                {items.length === 1 ? 'Moment' : 'Moments'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* ----- Uploading state ----- */
        <View style={styles.progressWrap}>
          <View style={styles.ringWrap}>
            <Svg width={128} height={128}>
              <Circle
                cx={64}
                cy={64}
                r={RADIUS}
                stroke="rgba(45,45,45,0.07)"
                strokeWidth={8}
                fill="none"
              />
              <Circle
                cx={64}
                cy={64}
                r={RADIUS}
                stroke={colors.peach}
                strokeWidth={8}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={
                  CIRCUMFERENCE - (CIRCUMFERENCE * progress) / 100
                }
                transform="rotate(-90 64 64)"
              />
            </Svg>
            <View style={styles.ringCenter}>
              <Text style={styles.ringPercent}>{progress}%</Text>
            </View>
          </View>

          <Text style={styles.progressTitle}>Preserving your moments...</Text>
          <Animated.View
            style={{ transform: [{ scale: sparklePulse }] }}
          >
            <Sparkles width={16} height={16} color={colors.peach} fill={colors.peach} />
          </Animated.View>
          <Text style={styles.progressBody}>
            Sending these special memories to the shared book. This will just
            take a second.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  headerSafe: { paddingTop: 52 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 8 },
  headerTitle: {
    fontSize: 17,
    fontStyle: 'italic',
    fontWeight: '600',
    color: colors.charcoal,
  },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 40,
  },
  dropZone: {
    borderRadius: 48,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(45,45,45,0.12)',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 44,
    paddingHorizontal: 24,
  },
  dropIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.beige,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  dropTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 6,
  },
  dropSubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginHorizontal: 4,
  },
  selectedTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  clearAll: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  previewCell: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#EDE9E1',
  },
  previewImage: { width: '100%', height: '100%' },
  removeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 32,
    paddingTop: 12,
    paddingBottom: 36,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.charcoal,
    paddingVertical: 17,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  uploadButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  progressWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  ringWrap: { marginBottom: 36 },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercent: {
    fontSize: 26,
    fontStyle: 'italic',
    fontWeight: '600',
    color: colors.charcoal,
  },
  progressTitle: {
    fontSize: 21,
    fontStyle: 'italic',
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 14,
    textAlign: 'center',
  },
  progressBody: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 21,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 280,
  },
});