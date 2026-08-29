import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronLeft,
  Sparkles,
  Play,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../App';
import { useFirebase } from '../lib/FirebaseProvider';
import { recapsApi } from '../lib/api/endpoints';
import { resolveAssetUrl } from '../lib/config';
import { colors, radius } from '../lib/theme';
import type { Recap } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Recap'>;

const SCREEN_WIDTH = Dimensions.get('window').width;

/** Deterministic pseudo-random in [0,1) so particle layout is stable. */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 999 + 1) * 10000;
  return x - Math.floor(x);
}

function buildLocalRecap(
  albumTitle: string,
  photoCount: number,
  memberCount: number
): Pick<Recap, 'title' | 'summary'> {
  const titles = [
    'A Journey Through Time',
    'Echoes of Laughter',
    'Moments That Stayed',
    'The Story of Us',
  ];
  const title =
    titles[Math.floor(seededRandom(albumTitle.length) * titles.length)];

  const summary =
    `From the first frame to the last, "${albumTitle}" holds ${photoCount} ` +
    `shared moment${photoCount === 1 ? '' : 's'} created by ${memberCount} loved one${
      memberCount === 1 ? '' : 's'
    }. Every laugh, every quiet glance — beautifully preserved in this family vault.`;

  return { title, summary };
}

export default function RecapScreen({ route, navigation }: Props) {
  const { albumId } = route.params;
  const { albums } = useFirebase();
  const album = albums.find((a) => a.id === albumId);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [recap, setRecap] = useState<(Pick<Recap, 'title' | 'summary'>) | null>(
    null
  );

  // Rotating loader ring.
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!loading) return;
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [loading, spin]);

  // Generate the recap via the backend (which uses Gemini with a local
  // fallback); if the backend is unreachable, fall back to the local template.
  useEffect(() => {
    let cancelled = false;

    const generate = async () => {
      const fallback = buildLocalRecap(
        album?.title ?? 'Our Vault',
        album?.photoCount ?? 0,
        album?.members.length ?? 1
      );

      try {
        const recap = await recapsApi.generate(albumId, [
          'ceremony',
          'sunset hike',
          'laughter',
          'dance floor',
        ]);
        if (!cancelled) setRecap(recap);
      } catch (error) {
        console.warn('Recap generation failed, using local fallback:', error);
        if (!cancelled) setRecap(fallback);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    generate();
    return () => {
      cancelled = true;
    };
  }, [album, albumId]);

  const shareRecap = async () => {
    if (!recap || !album) return;
    try {
      await Share.share({
        title: recap.title,
        message: `${recap.title}

"${recap.summary}"

— Kindred · ${album.title}`,
      });
    } catch {
      // User cancelled.
    }
  };

  const saveRecap = async () => {
    if (!recap) return;
    await Clipboard.setStringAsync(`${recap.title}

${recap.summary}`);
    Alert.alert('Recap saved', 'The recap text was copied to your clipboard.');
  };

  // Ambient floating particles.
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        left: seededRandom(i * 3 + 1) * SCREEN_WIDTH,
        size: 3 + seededRandom(i * 7 + 2) * 3,
        duration: 4000 + seededRandom(i * 11 + 3) * 4000,
        delay: seededRandom(i * 13 + 4) * 5000,
      })),
    []
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
          style={styles.glassButton}
        >
          <ChevronLeft width={24} height={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerCaption}>Memories Refined</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Particles */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {particles.map((p, i) => (
          <Particle key={i} {...p} />
        ))}
      </View>

      {!loading && recap ? (
        <View style={styles.contentWrap}>
          {/* Recap card */}
          <View style={styles.recapCard}>
            <Image
              source={{ uri: resolveAssetUrl(album?.coverPhotoURL) }}
              style={styles.recapCover}
            />
            <LinearGradient
              colors={['rgba(45,45,45,0.25)', 'rgba(45,45,45,0.75)']}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.recapCardInner}>
              <TouchableOpacity activeOpacity={0.9} style={styles.playButton}>
                <Play width={30} height={30} color={colors.charcoal} fill={colors.charcoal} />
              </TouchableOpacity>
              <Text style={styles.recapTitle}>{recap.title}</Text>
            </View>
          </View>

          <Text style={styles.recapSummary}>"{recap.summary}"</Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={saveRecap}
              style={styles.saveButton}
            >
              <Text style={styles.saveButtonText}>Save Recap</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={shareRecap}
              style={styles.shareButton}
            >
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.loadingWrap}>
          <View style={styles.ringWrap}>
            <Animated.View
              style={[
                styles.ring,
                { transform: [{ rotate: spin.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }) }] },
              ]}
            />
            <View style={styles.ringCenter}>
              <Sparkles width={30} height={30} color={colors.peach} fill={colors.peach} />
            </View>
          </View>
          <Text style={styles.loadingTitle}>Weaving your story...</Text>
          <Text style={styles.loadingCaption}>Kindred AI is working</Text>
        </View>
      )}
    </View>
  );
}

function Particle({
  left,
  size,
  duration,
  delay,
}: {
  left: number;
  size: number;
  duration: number;
  delay: number;
}) {
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.4,
            duration: duration / 2,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(y, {
          toValue: -110,
          duration,
          delay,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [y, opacity, duration, delay]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        bottom: -10,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.peach,
        opacity,
        transform: [{ translateY: y }],
      }}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.charcoal,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 5,
  },
  glassButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCaption: {
    color: colors.peach,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringWrap: {
    width: 96,
    height: 96,
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderTopColor: colors.peach,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    fontSize: 20,
    fontStyle: 'italic',
    fontWeight: '600',
    color: colors.beige,
    marginBottom: 8,
  },
  loadingCaption: {
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
  },
  contentWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 40,
  },
  recapCard: {
    width: '100%',
    maxWidth: 340,
    aspectRatio: 3 / 4,
    borderRadius: 48,
    overflow: 'hidden',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },
  recapCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  recapCardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
    paddingLeft: 4,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  recapTitle: {
    color: colors.white,
    fontSize: 24,
    lineHeight: 31,
    fontStyle: 'italic',
    fontWeight: '600',
    textAlign: 'center',
  },
  recapSummary: {
    color: 'rgba(241,236,225,0.85)',
    fontSize: 17,
    lineHeight: 27,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 40,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    alignSelf: 'stretch',
    maxWidth: 340,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.white,
    paddingVertical: 17,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.charcoal,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  shareButton: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
});