import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import {
  X,
  RotateCcw,
  Zap,
  ZapOff,
  Sparkles,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../App';
import { photosApi } from '../lib/api/endpoints';
import { useFirebase } from '../lib/FirebaseProvider';
import { resolveAssetUrl } from '../lib/config';
import { colors, radius } from '../lib/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Camera'>;

export default function CameraScreen({ route, navigation }: Props) {
  const { albumId } = route.params;
  const { user, albums } = useFirebase();
  const album = albums.find((a) => a.id === albumId);
  const insets = useSafeAreaInsets();

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'on' | 'off'>('off');
  const [capturing, setCapturing] = useState(false);
  const [lastShotUri, setLastShotUri] = useState<string | null>(null);
  const [uploadQueue, setUploadQueue] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Shutter + flash animations.
  const shutterScale = useRef(new Animated.Value(1)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!showConfirmation) return;
    const timer = setTimeout(() => setShowConfirmation(false), 2000);
    return () => clearTimeout(timer);
  }, [showConfirmation]);

  const capture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);

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

      // Upload in the background so rapid captures stay snappy.
      void uploadMemory(photo);
    } catch (error) {
      console.error('Capture failed:', error);
    } finally {
      setCapturing(false);
    }
  };

  const uploadMemory = async (photo: { base64?: string; uri?: string }) => {
    if (!user) return;
    try {
      if (!photo.uri) {
        throw new Error('Camera capture returned no image data.');
      }

      // Stream the captured file to the backend (stores + serves it).
      await photosApi.uploadFile(
        albumId,
        { uri: photo.uri, name: `capture-${Date.now()}.jpg`, type: 'image/jpeg' },
        { timestampLabel: 'Live Capture' }
      );

      setUploadQueue((q) => Math.max(0, q - 1));
      setShowConfirmation(true);
    } catch (error) {
      console.warn('Failed to save capture:', error);
      setUploadQueue((q) => Math.max(0, q - 1));
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
      />
      {/* Cinematic vignette */}
      <View style={styles.vignetteTop} pointerEvents="none" />
      <View style={styles.vignetteBottom} pointerEvents="none" />

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

      <View style={{ flex: 1 }} />

      {/* Bottom interface */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 28 }]}>
        {/* Upload status pill */}
        {(uploadQueue > 0 || showConfirmation) && (
          <View style={styles.statusPill}>
            {uploadQueue > 0 ? (
              <>
                <Sparkles width={14} height={14} color={colors.peach} fill={colors.peach} />
                <Text style={styles.statusPillUploading}>
                  Preserving {uploadQueue} moment{uploadQueue > 1 ? 's' : ''}...
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

          {/* Shutter */}
          <TouchableOpacity activeOpacity={0.9} onPress={capture}>
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
              onPress={() => setFlash((f) => (f === 'on' ? 'off' : 'on'))}
              style={styles.glassRound}
            >
              {flash === 'on' ? (
                <Zap width={20} height={20} color={colors.peach} fill={colors.peach} />
              ) : (
                <ZapOff width={20} height={20} color={colors.white} />
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

      {/* Capture flash overlay */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, styles.flashOverlay, { opacity: flashOpacity }]}
      />
    </View>
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