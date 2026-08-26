import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&q=80&w=1200';

export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.timing(bgOpacity, {
      toValue: 0.65,
      duration: 2000,
      useNativeDriver: true,
    }).start();

    Animated.sequence([
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.spring(contentTranslate, {
          toValue: 0,
          bounciness: 4,
          speed: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [bgOpacity, contentOpacity, contentTranslate]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: bgOpacity }]}>
        <Image source={{ uri: HERO_IMAGE }} style={styles.heroImage} />
      </Animated.View>

      <LinearGradient
        colors={['rgba(45,45,45,0)', 'rgba(45,45,45,0.85)']}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslate }],
          },
        ]}
      >
        <View style={styles.logoBadge}>
          <Text style={styles.logoLetter}>K</Text>
        </View>
        <Text style={styles.title}>Kindred</Text>
        <Text style={styles.subtitle}>Shared Memory Vault</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: Dimensions.get('window').width,
    height: '100%',
    resizeMode: 'cover',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  logoLetter: {
    color: colors.white,
    fontSize: 28,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  title: {
    color: colors.cream,
    fontSize: 36,
    fontStyle: 'italic',
    fontWeight: '600',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(253,251,247,0.4)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 5,
    textTransform: 'uppercase',
  },
});