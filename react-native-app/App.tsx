import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { FirebaseProvider } from './lib/FirebaseProvider';
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import AlbumDetailScreen from './screens/AlbumDetailScreen';
import InviteScreen from './screens/InviteScreen';
import ProfileScreen from './screens/ProfileScreen';
import UploadScreen from './screens/UploadScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <FirebaseProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Splash"
          screenOptions={{ 
            headerShown: false,
            gestureEnabled: true,
            cardStyle: { backgroundColor: '#FDFBF7' } 
          }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen} />
          <Stack.Screen name="Invite" component={InviteScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Upload" component={UploadScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </FirebaseProvider>
  );
}
