# Kindred React Native Implementation

This directory contains the React Native version of the Kindred Collaborative Memory app.

## Prerequisites

1. **Expo CLI**: `npm install -g expo-cli`
2. **Firebase Setup**: Ensure you have a `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) in the root if using native Firebase, or use the web SDK config provided in `src/lib/firebase.ts`.

## Setup Instructions

1. Create a new Expo project:
   ```bash
   npx create-expo-app MyKindredApp
   cd MyKindredApp
   ```

2. Install dependencies:
   ```bash
   npm install @react-navigation/native @react-navigation/stack react-native-screens react-native-safe-area-context lucide-react-native nativewind tailwindcss react-native-reanimated firebase date-fns
   ```

3. Configure Tailwind:
   Follow the [NativeWind installation guide](https://www.nativewind.dev/quick-starts/expo) to set up your `tailwind.config.js` and `babel.config.js`.

4. Copy the files from this directory into your project.

## Key Differences from Web
- **Layout**: Uses `View`, `ScrollView`, and `SafeAreaView` instead of `div` and `main`.
- **Text**: All text must be wrapped in `<Text>`.
- **Images**: Uses `Image` component.
- **Navigation**: Uses `@react-navigation/stack` instead of conditional state rendering.
- **Animations**: Uses `react-native-reanimated` (or `moti`) instead of `motion-dom`.
