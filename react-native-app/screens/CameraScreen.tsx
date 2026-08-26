import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  Animated,
  PanResponder,
  Platform,
  ScrollView,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  type CameraRatio,
} from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import {
  X,
  RotateCcw,
  Zap,
  ZapOff,
  Sparkles,
  CheckCircle2,
  Image as ImageIcon,
  Grid3x3,
  Timer,
  Flashlight,
  FlashlightOff,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../App';
import { photosApi } from '../lib/api/endpoints';
import { useFirebase } from '../lib/FirebaseProvider';
import { resolveAssetUrl } from '../lib/config';
import { colors, radius } from '../lib/theme';
import { FILTERS, applyPhotoFilter, type PhotoFilter } from '../lib/photoFilters';

type Props = NativeStackScreenProps<RootStackParamList, 'Camera'>;

export default function CameraScreen({ route, navigation }: Props) {
  const { albumId } = route.params;
  const { user, albums } = useFirebase();
  const album = albums.find((a) => a.id === albumId);
  const insets = useSafeAreaInsets();

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [torch, setTorch] = useState(false);
  const [grid, setGrid] = useState(false);
  const [timer, setTimer] = useState<'off' | 3 | 10>('off');
  const [ratio, setRatio] = useState<CameraRatio>('4:3');
  const [zoom, setZoom] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [bursting, setBursting] = useState(false);
  const [burstCount, setBurstCount] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [lastShotUri, setLastShotUri] = useState<string | null>(null);
  const [uploadQueue, setUploadQueue] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [filter, setFilter] = useState<PhotoFilter>(FILTERS[0]);
  const [processingFilterLabel, setProcessingFilterLabel] = useState<string | null>(null);

  // Serializes filter processing + uploads so heavy jpeg-js work never overlaps.
  const processingChain = useRef<Promise<void>>(Promise.resolve());
  // Live zoom (kept in a ref so the pinch responder never reads a stale closure).
  const zoomRef = useRef(0);
  // Hold-to-burst machinery.
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pressingRef = useRef(false);
  const burstingRef = useRef(false);
  const shotInFlightRef = useRef(false);
  // Self-timer countdown machinery.
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Pinch-to-zoom tracking.
  const pinchStartDistRef = useRef<number | null>(null);
  const zoomAtPinchStartRef = useRef(0);

  // Shutter + flash + countdown animations.
  const shutterScale = useRef(new Animated.Value(1)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const countdownPulse = useRef(new Animated.Value(0)).current;

  // Pulse the self-timer number on every tick.
  useEffect(() => {
    if (countdown === null) return;
    countdownPulse.setValue(0);
    Animated.timing(countdownPulse, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [countdown, countdownPulse]);

  // Clean up timers on unmount.
  useEffect(() => {
    return () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
      if (burstTimerRef.current) clearInterval(burstTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showConfirmation) return;
    const timer = setTimeout(() => setShowConfirmation(false), 2000);
    return () => clearTimeout(timer);
  }, [showConfirmation]);

  const setZoomSafe = (next: number) => {
    const clamped = Math.min(1, Math.max(0, next));
    zoomRef.current = clamped;
    setZoom(clamped);
  };

  /** Zoom readout (1.0x → 4.0x across the device's supported range). */
  const formatZoom = (z: number) => `${(1 + z * 3).toFixed(1)}x`;

  // Two-finger pinch-to-zoom over the preview (single taps pass through).
  const pinchResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => g.numberActiveTouches === 2,
        onPanResponderMove: (e) => {
          const touches = e.nativeEvent.touches;
          if (touches.length !== 2) return;
          const dx = Math.abs((touches[0]?.pageX ?? 0) - (touches[1]?.pageX ?? 0));
          const dy = Math.abs((touches[0]?.pageY ?? 0) - (touches[1]?.pageY ?? 0));
          const dist = Math.max(dx, dy);
          if (pinchStartDistRef.current == null) {
            pinchStartDistRef.current = dist;
            zoomAtPinchStartRef.current = zoomRef.current;
          } else if (dist > 0) {
            setZoomSafe(zoomAtPinchStartRef.current * (dist / pinchStartDistRef.current));
          }
        },
        onPanResponderRelease: () => (pinchStartDistRef.current = null),
        onPanResponderTerminate: () => (pinchStartDistRef.current = null),
      }),
    []
  );

  /** Captures a single frame (quiet = no shutter animation / capture lock). */
  const takeShot = async (quiet = false) => {
    if (!cameraRef.current || shotInFlightRef.current) return null;
    shotInFlightRef.current = true;
    if (!quiet) setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.55,
        exif: false,
        // NOTE: processing must NOT be skipped — skipProcessing returns the raw
        // sensor frame without rotation, producing photos with the wrong
        // orientation/dimensions (the tall-and-narrow aspect ratio bug).
      });

      if (photo?.uri) setLastShotUri(photo.uri);
      setUploadQueue((q) => q + 1);

      // Serialize processing + uploads (rapid captures queue up cleanly).
      processingChain.current = processingChain.current
        .then(() => uploadMemory(photo, filter))
        .catch((error) => console.warn('Capture chain error:', error));
      return photo?.uri ?? null;
    } catch (error) {
      console.error('Capture failed:', error);
      return null;
    } finally {
      shotInFlightRef.current = false;
      if (!quiet) setCapturing(false);
    }
  };

  /** Single capture with shutter + flash feedback (used by the shutter button). */
  const capture = async () => {
    if (!cameraRef.current || capturing || countdown !== null) return;

    // Shutter press feedback.
    Animated.sequence([
      Animated.timing(shutterScale, {
        toValue: 0.85,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(shutterScale, {
        toValue: 1,
        bounciness: 6,
        speed: 12,
        useNativeDriver: true,
      }),
    ]).start();

    // White flash effect.
    flashOpacity.setValue(1);
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();

    await takeShot(false);
  };

  /** Quiet burst frame — never locks, so frames overlap smoothly. */
  const burstShot = async () => {
    if (shotInFlightRef.current) return;
    const uri = await takeShot(true);
    if (uri) setBurstCount((c) => c + 1);
  };

  const startBurst = () => {
    if (burstingRef.current) return;
    burstingRef.current = true;
    setBursting(true);
    setBurstCount(0);
    void burstShot();
    burstTimerRef.current = setInterval(() => void burstShot(), 350);
  };

  const stopBurst = () => {
    burstingRef.current = false;
    setBursting(false);
    if (burstTimerRef.current) {
      clearInterval(burstTimerRef.current);
      burstTimerRef.current = null;
    }
  };

  // ----- Shutter press handlers (quick tap = shot, hold = burst) -----
  const onShutterPressIn = () => {
    if (capturing || countdown !== null) return;
    pressingRef.current = true;
    pressTimerRef.current = setTimeout(() => {
      if (pressingRef.current) startBurst();
    }, 350);
  };

  const onShutterPressOut = () => {
    if (!pressingRef.current) return;
    pressingRef.current = false;
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (burstingRef.current) {
      stopBurst();
      return;
    }
    void fireShot();
  };

  /** Counts down the self-timer, then takes the shot (auto-disarms). */
  const runCountdown = (seconds: number) => {
    let remaining = seconds;
    setCountdown(remaining);
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = null;
        setCountdown(null);
        setTimer('off');
        void capture();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  };

  /** Shutter press action: fires immediately, or arms the self-timer. */
  const fireShot = () => {
    if (!cameraRef.current || capturing || countdown !== null) return;
    if (timer !== 'off') {
      runCountdown(timer);
    } else {
      void capture();
    }
  };

  const uploadMemory = async (
    photo: { base64?: string; uri?: string },
    selectedFilter: PhotoFilter
  ) => {
    if (!user) return;
    try {
      if (!photo.uri) {
        throw new Error('Camera capture returned no image data.');
      }

      if (selectedFilter.id !== 'original') {
        // Bake the artistic filter into a resized copy, upload as base64.
        setProcessingFilterLabel(selectedFilter.label);
        const base64 = await applyPhotoFilter(photo.uri, selectedFilter);
        await photosApi.create(albumId, base64, { timestampLabel: 'Live Capture' });
      } else {
        // Stream the original capture to the backend (stores + serves it).
        await photosApi.uploadFile(
          albumId,
          { uri: photo.uri, name: `capture-${Date.now()}.jpg`, type: 'image/jpeg' },
          { timestampLabel: 'Live Capture' }
        );
      }

      setUploadQueue((q) => Math.max(0, q - 1));
      setShowConfirmation(true);
    } catch (error) {
      console.warn('Failed to save capture:', error);
      setUploadQueue((q) => Math.max(0, q - 1));
    } finally {
      setProcessingFilterLabel(null);
    }
  };

  // ----- Permission gate -----
  if (!permission) {
    return <View style={styles.root} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.permissionWrap]}>
        <StatusBar style="light" />
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionBody}>
          Kindred uses your camera to capture spontaneous moments for this
          vault.
        </Text>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() =>
            permission.canAskAgain
              ? void requestPermission()
              : void Linking.openSettings()
          }
          style={styles.permissionButton}
        >
          <Text style={styles.permissionButtonText}>
            {permission.canAskAgain ? 'Grant Access' : 'Open Settings'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          style={{ marginTop: 18 }}
        >
          <Text style={styles.permissionCancel}>Not now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* Camera preview */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        flash={flash}
        mode="picture"
        zoom={zoom}
        enableTorch={torch}
        mirror={facing === 'front'}
        ratio={Platform.OS === 'android' ? ratio : undefined}
      />
      {/* Cinematic vignette */}
      <View style={styles.vignetteTop} pointerEvents="none" />
      <View style={styles.vignetteBottom} pointerEvents="none" />

      {/* Pinch-to-zoom gesture layer (transparent — controls stay above) */}
      <View style={StyleSheet.absoluteFillObject} {...pinchResponder.panHandlers} />

      {/* Rule-of-thirds grid */}
      {grid && (
        <View style={[StyleSheet.absoluteFillObject, styles.gridOverlay]} pointerEvents="none">
          <View style={[styles.gridLineV, { left: '33.333%' }]} />
          <View style={[styles.gridLineV, { left: '66.666%' }]} />
          <View style={[styles.gridLineH, { top: '33.333%' }]} />
          <View style={[styles.gridLineH, { top: '66.666%' }]} />
        </View>
      )}

      {/* Top controls */}
      <View style={[styles.topControls, { paddingTop: insets.top + 10 }]}>
        <View>
          <View style={styles.albumChip}>
            <View style={styles.albumChipThumb}>
              {album && (
                <Image
                  source={{ uri: resolveAssetUrl(album.coverPhotoURL) }}
                  style={styles.albumChipThumbImage}
                />
              )}
            </View>
            <View>
              <Text style={styles.albumChipCaption}>Capturing for</Text>
              <Text style={styles.albumChipTitle} numberOfLines={1}>
                {album?.title ?? 'Vault'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
          style={styles.glassRound}
        >
          <X width={24} height={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Professional utility rail: grid / timer / torch / aspect */}
      <View style={[styles.utilityRail, { top: insets.top + 88 }]}>
        <UtilityButton
          Icon={Grid3x3}
          label="Grid"
          active={grid}
          onPress={() => setGrid((g) => !g)}
        />
        <UtilityButton
          Icon={Timer}
          label={timer === 10 ? '10s' : timer === 3 ? '3s' : 'Timer'}
          active={timer !== 'off'}
          onPress={() => setTimer((t) => (t === 'off' ? 3 : t === 3 ? 10 : 'off'))}
        />
        <UtilityButton
          Icon={torch ? FlashlightOff : Flashlight}
          label="Torch"
          active={torch}
          onPress={() => setTorch((t) => !t)}
        />
        {Platform.OS === 'android' && (
          <UtilityButton
            iconText={ratio}
            label="Ratio"
            active
            onPress={() =>
              setRatio((r) => (r === '4:3' ? '16:9' : r === '16:9' ? '1:1' : '4:3'))
            }
          />
        )}
      </View>

      <View style={{ flex: 1 }} />

      {/* Zoom readout (tap to reset) + burst badge */}
      <View style={styles.zoomRow}>
        {zoom > 0 && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setZoomSafe(0)}
            style={styles.zoomPill}
          >
            <Text style={styles.zoomPillText}>{formatZoom(zoom)}</Text>
          </TouchableOpacity>
        )}
        {bursting && (
          <View style={styles.burstBadge}>
            <Text style={styles.burstBadgeText}>BURST · {burstCount}</Text>
          </View>
        )}
      </View>

      {/* Artistic filter selector */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const active = filter.id === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                activeOpacity={0.85}
                onPress={() => setFilter(f)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text
                  style={[styles.filterChipText, active && styles.filterChipTextActive]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Bottom interface */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom - 8, 8) }]}>
        {/* Upload status pill */}
        {(uploadQueue > 0 || showConfirmation) && (
          <View style={styles.statusPill}>
            {uploadQueue > 0 ? (
              <>
                <Sparkles width={14} height={14} color={colors.peach} fill={colors.peach} />
                <Text style={styles.statusPillUploading}>
                  {processingFilterLabel
                    ? `Applying ${processingFilterLabel}…`
                    : `Preserving ${uploadQueue} moment${uploadQueue > 1 ? 's' : ''}...`}
                </Text>
              </>
            ) : (
              <>
                <CheckCircle2 width={14} height={14} color={colors.success} />
                <Text style={styles.statusPillSaved}>Memory Saved ✨</Text>
              </>
            )}
          </View>
        )}

        <View style={styles.controlsRow}>
          {/* Last shot preview */}
          <View style={styles.previewThumb}>
            {lastShotUri ? (
              <Image source={{ uri: lastShotUri }} style={styles.previewImage} />
            ) : (
              <ImageIcon width={20} height={20} color="rgba(255,255,255,0.4)" />
            )}
          </View>

          {/* Shutter — tap for a shot, hold for burst */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPressIn={onShutterPressIn}
            onPressOut={onShutterPressOut}
            disabled={capturing || countdown !== null}
          >
            <Animated.View
              style={[
                styles.shutterOuter,
                { transform: [{ scale: shutterScale }] },
              ]}
            >
              <View style={styles.shutterInner} />
            </Animated.View>
          </TouchableOpacity>

          {/* Flash + flip */}
          <View style={{ gap: 16 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setFlash((f) => (f === 'off' ? 'on' : f === 'on' ? 'auto' : 'off'))}
              style={styles.glassRound}
            >
              {flash === 'off' ? (
                <ZapOff width={20} height={20} color={colors.white} />
              ) : (
                <View>
                  <Zap
                    width={20}
                    height={20}
                    color={colors.peach}
                    fill={flash === 'on' ? colors.peach : 'transparent'}
                  />
                  {flash === 'auto' && <Text style={styles.flashAutoBadge}>A</Text>}
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                setFacing((f) => (f === 'back' ? 'front' : 'back'))
              }
              style={styles.glassRound}
            >
              <RotateCcw width={20} height={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.bottomCaption}>Spontaneous Moment</Text>
      </View>

      {/* Self-timer countdown */}
      {countdown !== null && (
        <View
          style={[StyleSheet.absoluteFillObject, styles.countdownOverlay]}
          pointerEvents="none"
        >
          <Animated.Text
            style={[
              styles.countdownText,
              {
                transform: [
                  {
                    scale: countdownPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1.5, 1],
                    }),
                  },
                ],
                opacity: countdownPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 1],
                }),
              },
            ]}
          >
            {countdown}
          </Animated.Text>
        </View>
      )}

      {/* Capture flash overlay */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, styles.flashOverlay, { opacity: flashOpacity }]}
      />
    </View>
  );
}

/** Small round toggle used in the camera's professional utility rail. */
function UtilityButton({
  Icon,
  iconText,
  label,
  active,
  onPress,
}: {
  Icon?: React.ComponentType<{ width?: number; height?: number; color?: string }>;
  iconText?: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.utilButton, active && styles.utilButtonActive]}
    >
      {Icon ? (
        <Icon width={20} height={20} color={active ? colors.charcoal : colors.white} />
      ) : iconText ? (
        <Text style={[styles.utilIconText, active && styles.utilLabelActive]}>{iconText}</Text>
      ) : null}
      <Text style={[styles.utilLabel, active && styles.utilLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },

  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  gridOverlay: {
    zIndex: 2,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },

  utilityRail: {
    position: 'absolute',
    right: 16,
    gap: 12,
    zIndex: 4,
  },
  utilButton: {
    width: 52,
    alignItems: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  utilButtonActive: {
    backgroundColor: colors.peach,
    borderColor: colors.peach,
  },
  utilIconText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  utilLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  utilLabelActive: {
    color: colors.charcoal,
  },

  zoomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 18,
    zIndex: 3,
  },
  zoomPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  zoomPillText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  burstBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.peach,
  },
  burstBadgeText: {
    color: colors.charcoal,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  countdownOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 20,
  },
  countdownText: {
    color: colors.white,
    fontSize: 120,
    fontWeight: '800',
  },

  flashAutoBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    fontSize: 9,
    fontWeight: '900',
    color: colors.peach,
    backgroundColor: colors.charcoal,
    borderRadius: 8,
    paddingHorizontal: 3,
    paddingVertical: 1,
    overflow: 'hidden',
  },

  topControls: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 3,
  },
  albumChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  albumChipThumb: {
    width: 22,
    height: 22,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.charcoal,
  },
  albumChipThumbImage: { width: '100%', height: '100%' },
  albumChipCaption: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  albumChipTitle: {
    color: colors.white,
    fontSize: 11,
    fontStyle: 'italic',
    fontWeight: '600',
    maxWidth: 130,
  },
  glassRound: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomBar: {
    paddingHorizontal: 32,
    alignItems: 'center',
    zIndex: 3,
  },
  filterWrap: {
    zIndex: 3,
    paddingBottom: 22,
  },
  filterRow: {
    paddingHorizontal: 24,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  filterChipActive: {
    backgroundColor: colors.peach,
    borderColor: colors.peach,
  },
  filterChipText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  filterChipTextActive: {
    color: colors.charcoal,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(232,158,130,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(232,158,130,0.35)',
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 26,
  },
  statusPillUploading: {
    color: colors.peach,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  statusPillSaved: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  controlsRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  previewThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: { width: '100%', height: '100%' },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  bottomCaption: {
    marginTop: 26,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },

  flashOverlay: { backgroundColor: '#FFFFFF', zIndex: 50 },

  permissionWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    color: colors.white,
    fontSize: 22,
    fontStyle: 'italic',
    fontWeight: '600',
    marginBottom: 12,
  },
  permissionBody: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: colors.peach,
    paddingHorizontal: 32,
    paddingVertical: 15,
    borderRadius: radius.md,
  },
  permissionButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  permissionCancel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
});