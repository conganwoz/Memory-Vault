import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Home, Plus, User as UserIcon } from 'lucide-react-native';
import { colors, radius } from './theme';

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

export function Avatar({
  uri,
  size = 40,
  borderWidth = 0,
  borderColor = colors.cream,
}: {
  uri?: string;
  size?: number;
  borderWidth?: number;
  borderColor?: string;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: colors.beige,
        borderWidth,
        borderColor,
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <UserIcon width={size * 0.5} height={size * 0.5} color={colors.muted} />
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'dark',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'dark' | 'light' | 'danger';
}) {
  const bg =
    variant === 'danger'
      ? '#FEE2E2'
      : variant === 'light'
        ? colors.white
        : colors.charcoal;
  const fg =
    variant === 'danger'
      ? colors.danger
      : variant === 'light'
        ? colors.charcoal
        : colors.white;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: bg },
        (disabled || loading) && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.buttonLabel, { color: fg }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

export function IconButton({
  children,
  onPress,
  size = 40,
  background = 'rgba(255,255,255,0.9)',
  radiusOverride,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  size?: number;
  background?: string;
  radiusOverride?: number;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.iconButton,
        {
          width: size,
          height: size,
          backgroundColor: background,
          borderRadius: radiusOverride ?? radius.md,
        },
      ]}
    >
      {children}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Section caption ("YOUR MEMORIES", "SETTINGS & PRIVACY", ...)
// ---------------------------------------------------------------------------

export function Caption({
  children,
  color = colors.muted,
  align = 'left',
}: {
  children: React.ReactNode;
  color?: string;
  align?: 'left' | 'center';
}) {
  return (
    <Text
      style={{
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2.5,
        textTransform: 'uppercase',
        color,
        textAlign: align,
      }}
    >
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

export function Spinner({ light }: { light?: boolean }) {
  return (
    <ActivityIndicator
      size="small"
      color={light ? colors.peach : colors.charcoal}
    />
  );
}

// ---------------------------------------------------------------------------
// Floating bottom navigation (Home / Profile)
// ---------------------------------------------------------------------------

export function FloatingNav({
  active,
  onHome,
  onCreate,
  onProfile,
}: {
  active: 'home' | 'profile';
  onHome: () => void;
  onCreate: () => void;
  onProfile: () => void;
}) {
  return (
    <View style={styles.navWrap} pointerEvents="box-none">
      <View style={styles.navBar}>
        <TouchableOpacity activeOpacity={0.7} onPress={onHome} hitSlop={12}>
          <Home
            width={24}
            height={24}
            color={active === 'home' ? colors.peach : 'rgba(253,251,247,0.4)'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onCreate}
          style={styles.navCreate}
        >
          <Plus width={26} height={26} color={colors.charcoal} />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} onPress={onProfile} hitSlop={12}>
          <UserIcon
            width={24}
            height={24}
            color={
              active === 'profile' ? colors.peach : 'rgba(253,251,247,0.4)'
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 18,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 28,
    alignItems: 'center',
  },
  navBar: {
    width: '85%',
    maxWidth: 380,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.charcoal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  navCreate: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});