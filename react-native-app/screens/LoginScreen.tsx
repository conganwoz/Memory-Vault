import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { MailOpen } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFirebase } from '../lib/FirebaseProvider';
import { authApi } from '../lib/api/endpoints';
import { ApiError } from '../lib/api/client';
import { colors, radius } from '../lib/theme';
import { PrimaryButton } from '../lib/ui';

const IMG_1 =
  'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800';
const IMG_2 =
  'https://images.unsplash.com/photo-1520390138845-fd2d229dd553?auto=format&fit=crop&q=80&w=800';

export default function LoginScreen() {
  const { signIn, signUp, signInGoogle } = useFirebase();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  // Set once an account needs email confirmation — shows the verify panel.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);

  // Google sign-in via expo-auth-session (requires OAuth client IDs in app.json).
  const googleConfig = Constants.expoConfig?.extra as
    | {
        googleWebClientId?: string;
        googleIosClientId?: string;
        googleAndroidClientId?: string;
      }
    | undefined;

  // expo-auth-session throws unless every client ID required by the current
  // platform is present, so we only mount the real flow once fully configured.
  const googleReady =
    !!googleConfig?.googleWebClientId &&
    (Platform.OS === 'ios'
      ? !!googleConfig?.googleIosClientId
      : !!googleConfig?.googleAndroidClientId);

  const handleGoogleIdToken = async (idToken: string) => {
    setBusy(true);
    try {
      await signInGoogle(idToken);
      // Navigation happens automatically once auth state updates.
    } catch (error) {
      Alert.alert(
        'Sign-in failed',
        error instanceof Error ? error.message : 'Please try again.'
      );
      setBusy(false);
    }
  };

  const showGoogleSetupHelp = () => {
    const missing =
      !googleConfig?.googleWebClientId
        ? 'a Web client ID (googleWebClientId)' +
          (Platform.OS === 'ios'
            ? ' and an iOS client ID (googleIosClientId)'
            : ' and an Android client ID (googleAndroidClientId)')
        : Platform.OS === 'ios'
          ? 'an iOS client ID (googleIosClientId)'
          : 'an Android client ID (googleAndroidClientId)';
    Alert.alert(
      'Google sign-in not fully configured',
      `This project still needs ${missing}.\n\nCreate OAuth client IDs in Google Cloud Console, add them to app.json under expo.extra, add the same IDs to the backend's GOOGLE_CLIENT_IDS, then restart the dev server.\n\nFull steps: react-native-app/README.md`
    );
  };

  const handleSubmit = async () => {
    if (busy) return;

    if (mode === 'signup' && !name.trim()) {
      Alert.alert('Missing name', 'Tell us what to call you.');
      return;
    }
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        // Account created but unverified — email the confirmation link.
        const message = await signUp(name, email.trim().toLowerCase(), password);
        setPendingEmail(email.trim().toLowerCase());
        setVerifyNotice(message);
      } else {
        await signIn(email, password);
        // Navigation happens automatically once auth state updates.
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        // The account exists but hasn't been verified yet.
        setPendingEmail(email.trim().toLowerCase());
        setVerifyNotice(error.message);
      } else {
        Alert.alert(
          mode === 'signin' ? 'Sign-in failed' : 'Account creation failed',
          error instanceof Error ? error.message : 'Please try again.'
        );
      }
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    try {
      const { message } = await authApi.resendVerification(pendingEmail);
      setVerifyNotice(message);
    } catch (error) {
      Alert.alert(
        'Could not resend',
        error instanceof Error ? error.message : 'Please try again.'
      );
    }
  };

  const closeVerifyPanel = () => {
    setPendingEmail(null);
    setVerifyNotice(null);
    setMode('signin');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Stacked photo collage */}
        <View style={styles.collage}>
          <View style={[styles.photoBack, styles.shadowLg]}>
            <Image source={{ uri: IMG_1 }} style={styles.photoImage} />
          </View>
          <View style={[styles.photoFront, styles.shadowMd]}>
            <Image source={{ uri: IMG_2 }} style={styles.photoImage} />
          </View>
        </View>

        {pendingEmail ? (
          <View style={styles.verifyPanel}>
            <View style={styles.verifyIconWrap}>
              <MailOpen width={30} height={30} color={colors.white} />
            </View>
            <Text style={styles.verifyTitle}>Check your inbox</Text>
            <Text style={styles.verifyBody}>
              {verifyNotice ??
                `We sent a verification link to ${pendingEmail}. Tap it to activate your account, then sign in.`}
            </Text>
            <PrimaryButton label="Resend email" onPress={handleResend} />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={closeVerifyPanel}
              style={styles.verifyBackButton}
            >
              <Text style={styles.verifyBackText}>Go to sign in</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.title}>
              {mode === 'signin' ? 'Welcome Home' : 'Join Kindred'}
            </Text>
        <Text style={styles.subtitle}>
          Invite your loved ones and start building your shared story, one frame
          at a time.
        </Text>

        {mode === 'signup' && (
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            textContentType="name"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType={
            mode === 'signin' ? 'password' : 'newPassword'
          }
        />

        <PrimaryButton
          label={mode === 'signin' ? 'Sign In' : 'Create Account'}
          onPress={handleSubmit}
          loading={busy}
        />

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          style={styles.switchMode}
        >
          <Text style={styles.switchModeText}>
            {mode === 'signin'
              ? 'New here? Create an account'
              : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {googleReady ? (
          <GoogleSignInButton
            onIdToken={(token) => void handleGoogleIdToken(token)}
            disabled={busy}
          />
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={showGoogleSetupHelp}
            style={styles.googleButton}
          >
            <View style={styles.googleBadge}>
              <Text style={styles.googleBadgeText}>G</Text>
            </View>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>
        )}

          <Text style={styles.legal}>
            By continuing, you agree to our terms. We promise to keep your
            memories private and safe.
          </Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * The real Google flow, mounted only when the OAuth client IDs required by
 * the current platform are configured (see `googleReady` in LoginScreen).
 * expo-auth-session throws at request-creation time when e.g. `iosClientId`
 * is missing on iOS, so this component must never render unconfigured.
 */
function GoogleSignInButton({
  onIdToken,
  disabled,
}: {
  onIdToken: (idToken: string) => void;
  disabled?: boolean;
}) {
  const googleConfig = Constants.expoConfig?.extra as
    | {
        googleWebClientId?: string;
        googleIosClientId?: string;
        googleAndroidClientId?: string;
      }
    | undefined;

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: googleConfig!.googleWebClientId!,
    iosClientId:
      Platform.OS === 'ios' ? googleConfig?.googleIosClientId : undefined,
    androidClientId:
      Platform.OS === 'android' ? googleConfig?.googleAndroidClientId : undefined,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken;
      if (idToken) onIdToken(idToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => {
        promptAsync().catch(() =>
          Alert.alert(
            'Sign-in failed',
            'Could not start Google sign-in. Check your connection and try again.'
          )
        );
      }}
      disabled={disabled || !request}
      style={styles.googleButton}
    >
      <View style={styles.googleBadge}>
        <Text style={styles.googleBadgeText}>G</Text>
      </View>
      <Text style={styles.googleButtonText}>Continue with Google</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.cream,
    paddingHorizontal: 32,
    paddingBottom: 40,
    alignItems: 'center',
  },
  collage: {
    width: 256,
    height: 280,
    marginBottom: 44,
  },
  photoBack: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 256,
    height: 256,
    borderRadius: 16,
    overflow: 'hidden',
    transform: [{ rotate: '3deg' }],
  },
  photoFront: {
    position: 'absolute',
    bottom: 0,
    left: -24,
    width: 192,
    height: 192,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: colors.white,
    transform: [{ rotate: '-6deg' }],
  },
  photoImage: { width: '100%', height: '100%' },
  shadowLg: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  shadowMd: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: {
    fontSize: 34,
    fontStyle: 'italic',
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 14,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: 36,
  },
  input: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 15,
    color: colors.charcoal,
    marginBottom: 14,
  },
  switchMode: { marginTop: 18, paddingVertical: 6 },
  switchModeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.peach,
  },
  verifyPanel: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingTop: 12,
  },
  verifyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  verifyTitle: {
    fontSize: 24,
    fontStyle: 'italic',
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 12,
  },
  verifyBody: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 26,
    maxWidth: 320,
  },
  verifyBackButton: {
    marginTop: 18,
    paddingVertical: 6,
  },
  verifyBackText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    textDecorationLine: 'underline',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginVertical: 24,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(45,45,45,0.08)' },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  googleButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.charcoal,
    paddingVertical: 17,
    borderRadius: 16,
  },
  googleBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBadgeText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  googleButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  legal: {
    marginTop: 28,
    fontSize: 12,
    lineHeight: 19,
    color: 'rgba(140,140,140,0.75)',
    textAlign: 'center',
    maxWidth: 300,
  },
});