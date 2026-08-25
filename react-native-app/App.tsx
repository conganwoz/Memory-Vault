import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { FirebaseProvider, useFirebase } from './lib/FirebaseProvider';
import { colors } from './lib/theme';
import type { Photo } from './lib/types';

import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import CreateAlbumScreen from './screens/CreateAlbumScreen';
import AlbumDetailScreen from './screens/AlbumDetailScreen';
import InviteScreen from './screens/InviteScreen';
import PhotoViewerScreen from './screens/PhotoViewerScreen';
import RecentlyDeletedScreen from './screens/RecentlyDeletedScreen';
import UploadScreen from './screens/UploadScreen';
import RecapScreen from './screens/RecapScreen';
import ProfileScreen from './screens/ProfileScreen';
import CameraScreen from './screens/CameraScreen';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Home: undefined;
  Profile: undefined;
  CreateAlbum: undefined;
  AlbumDetail: { albumId: string };
  Invite: { albumId: string };
  PhotoViewer: { photo: Photo; albumOwnerId?: string; isDeleted?: boolean };
  RecentlyDeleted: { albumId: string; albumOwnerId?: string };
  Upload: { albumId: string };
  Recap: { albumId: string };
  Camera: { albumId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.cream,
    card: colors.cream,
    text: colors.charcoal,
    primary: colors.peach,
  },
};

/** Shows the splash for a minimum duration, then gates on auth state. */
function RootNavigator() {
  const { user, loading } = useFirebase();
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinSplashElapsed(true), 2200);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !minSplashElapsed) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      {!user ? (
        // ----- Auth flow -----
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
        </>
      ) : (
        // ----- Main app -----
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="CreateAlbum" component={CreateAlbumScreen} />
          <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen} />
          <Stack.Screen name="Invite" component={InviteScreen} />
          <Stack.Screen
            name="PhotoViewer"
            component={PhotoViewerScreen}
            options={{
              animation: 'fade',
              contentStyle: { backgroundColor: colors.charcoal },
            }}
          />
          <Stack.Screen name="RecentlyDeleted" component={RecentlyDeletedScreen} />
          <Stack.Screen name="Upload" component={UploadScreen} />
          <Stack.Screen
            name="Recap"
            component={RecapScreen}
            options={{
              animation: 'fade',
              contentStyle: { backgroundColor: colors.charcoal },
            }}
          />
          <Stack.Screen
            name="Camera"
            component={CameraScreen}
            options={{
              animation: 'fade',
              gestureEnabled: false,
              contentStyle: { backgroundColor: '#000000' },
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <FirebaseProvider>
        <StatusBar style="dark" />
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
      </FirebaseProvider>
    </SafeAreaProvider>
  );
}