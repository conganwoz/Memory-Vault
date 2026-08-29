import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronLeft,
  Camera,
  Calendar as CalendarIcon,
  Lock,
  Globe,
  Check,
} from 'lucide-react-native';
import { format } from 'date-fns';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../App';
import { useFirebase } from '../lib/FirebaseProvider';
import { uploadsApi } from '../lib/api/endpoints';
import { detectImageTone, type CoverTone } from '../lib/imageTone';
import { colors, radius } from '../lib/theme';
import { Caption, PrimaryButton } from '../lib/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateAlbum'>;

const PRIVACY_OPTIONS = [
  {
    id: 'invite' as const,
    label: 'Close Family',
    desc: 'Only explicitly invited loved ones',
    Icon: Lock,
  },
  {
    id: 'link' as const,
    label: 'Public Link',
    desc: 'Anyone with the secret link',
    Icon: Globe,
  },
];

/** Fallback cover used when no cover is picked (or the upload fails). */
const DEFAULT_COVER_URL =
  'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800';

/** A locally picked cover, kept as a file reference so it can be streamed
 * to the backend on create (no base64 buffered in memory). */
interface PickedCover {
  uri: string;
  name?: string;
  type?: string;
}

export default function CreateAlbumScreen({ navigation }: Props) {
  const { createAlbum } = useFirebase();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [privacy, setPrivacy] = useState<'invite' | 'link'>('invite');
  const [cover, setCover] = useState<PickedCover | null>(null);
  const [creating, setCreating] = useState(false);

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.4,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset.uri) return;
    setCover({
      uri: asset.uri,
      name: asset.fileName ?? 'cover.jpg',
      type: asset.mimeType ?? 'image/jpeg',
    });
  };

  const handleCreate = async () => {
    if (!title.trim() || creating) return;
    setCreating(true);
    try {
      let coverPhotoURL = DEFAULT_COVER_URL;
      let coverTone: CoverTone | undefined;

      if (cover) {
        try {
          // Upload the chosen cover to the backend so it is stored on the
          // server and visible to every member and device.
          coverPhotoURL = await uploadsApi.uploadFile(cover);
          // Detect dark/light so the album title stays readable on top.
          coverTone = await detectImageTone(cover.uri);
        } catch (error) {
          console.warn('Cover upload failed, using default cover:', error);
        }
      }

      await createAlbum({
        title: title.trim(),
        eventDate: date.toISOString(),
        privacy,
        coverPhotoURL,
        coverTone,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        'Could not create vault',
        error instanceof Error ? error.message : 'Please try again.'
      );
      setCreating(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ChevronLeft width={24} height={24} color={colors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Memory Vault</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Cover picker */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={pickCover}
          style={styles.coverPicker}
        >
          {cover ? (
            <>
              <Image source={{ uri: cover.uri }} style={styles.coverPreview} />
              <View style={styles.coverOverlay}>
                <Camera width={18} height={18} color={colors.white} />
                <Text style={styles.coverOverlayText}>Change Cover</Text>
              </View>
            </>
          ) : (
            <>
              <Camera width={40} height={40} color={colors.muted} opacity={0.5} />
              <Text style={styles.coverLabel}>Vault Cover</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.fieldGroup}>
          <Caption>Vault Title</Caption>
          <TextInput
            style={styles.input}
            placeholder="Summer in Tuscany..."
            placeholderTextColor={colors.muted}
            value={title}
            onChangeText={setTitle}
            maxLength={60}
          />
        </View>

        {/* Date */}
        <View style={styles.fieldGroup}>
          <Caption>Memorable Date</Caption>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.dateField}
            onPress={() => setShowPicker((v) => !v)}
          >
            <CalendarIcon width={20} height={20} color={colors.muted} />
            <Text style={styles.dateText}>{format(date, 'MMMM d, yyyy')}</Text>
          </TouchableOpacity>
          {showPicker && (
            <View
              style={
                Platform.OS === 'android'
                  ? styles.androidPickerWrap
                  : styles.iosPickerWrap
              }
            >
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_event, selected) => {
                  setShowPicker(false);
                  if (selected) setDate(selected);
                }}
              />
            </View>
          )}
        </View>

        {/* Privacy */}
        <View style={styles.fieldGroup}>
          <Caption>Access Tier</Caption>
          {PRIVACY_OPTIONS.map((option) => {
            const selected = privacy === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                activeOpacity={0.9}
                onPress={() => setPrivacy(option.id)}
                style={[
                  styles.privacyOption,
                  selected && styles.privacyOptionSelected,
                ]}
              >
                <View
                  style={[
                    styles.privacyIcon,
                    selected && styles.privacyIconSelected,
                  ]}
                >
                  <option.Icon
                    width={20}
                    height={20}
                    color={selected ? colors.white : colors.muted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.privacyLabel}>{option.label}</Text>
                  <Text style={styles.privacyDesc}>{option.desc}</Text>
                </View>
                {selected && (
                  <Check width={20} height={20} color={colors.peach} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <PrimaryButton
          label={creating ? 'Fortifying Vault...' : 'Initialize Memory Vault'}
          onPress={handleCreate}
          disabled={!title.trim()}
          loading={creating}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: {
    paddingHorizontal: 32,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontStyle: 'italic',
    fontWeight: '600',
    color: colors.charcoal,
  },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 48,
  },
  coverPicker: {
    width: 192,
    height: 256,
    alignSelf: 'center',
    borderRadius: 40,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(45,45,45,0.12)',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 44,
    overflow: 'hidden',
  },
  coverPreview: { ...StyleSheet.absoluteFillObject },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45,45,45,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  coverOverlayText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  coverLabel: {
    marginTop: 14,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  fieldGroup: { marginBottom: 36 },
  input: {
    marginTop: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 17,
    fontStyle: 'italic',
    color: colors.charcoal,
  },
  dateField: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  dateText: { fontSize: 15, color: colors.charcoal },
  iosPickerWrap: {
    marginTop: 8,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  androidPickerWrap: { marginTop: 8 },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 14,
  },
  privacyOptionSelected: {
    backgroundColor: 'rgba(232,158,130,0.08)',
    borderColor: colors.peach,
  },
  privacyIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.beige,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyIconSelected: { backgroundColor: colors.peach },
  privacyLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.charcoal,
    marginBottom: 3,
  },
  privacyDesc: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
  },
});