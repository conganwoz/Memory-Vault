import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronLeft,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Share2,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../App';
import { photosApi } from '../lib/api/endpoints';
import { resolveAssetUrl } from '../lib/config';
import { colors, radius } from '../lib/theme';
import { Avatar } from '../lib/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'PhotoViewer'>;

export default function PhotoViewerScreen({ route, navigation }: Props) {
  const { photo } = route.params;
  const insets = useSafeAreaInsets();
  const [liked, setLiked] = useState(false);

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
    Alert.alert(photo.uploaderName, photo.timestampLabel || 'Shared moment', [
      { text: 'Share photo', onPress: sharePhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
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
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={showMore}
            style={styles.glassButton}
          >
            <MoreHorizontal width={20} height={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* The photo */}
      <ScrollView
        contentContainerStyle={styles.imageScroll}
        maximumZoomScale={3}
        minimumZoomScale={1}
        showsVerticalScrollIndicator={false}
      >
        <Image source={{ uri: resolveAssetUrl(photo.url) }} style={styles.image} resizeMode="contain" />
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

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={sharePhoto}
              style={styles.shareFab}
            >
              <Text style={styles.shareFabText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
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
  imageScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
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
});