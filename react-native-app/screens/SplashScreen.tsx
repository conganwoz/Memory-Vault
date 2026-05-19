import React, { useEffect } from 'react';
import { View, Text, ImageBackground } from 'react-native';
import { StyledComponent } from 'nativewind';
import * as Animated from 'react-native-reanimated';

export default function SplashScreen({ navigation }: any) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 bg-[#2D2D2D] items-center justify-center">
      <View className="items-center">
        <View className="w-16 h-16 bg-[#E89E82] rounded-2xl items-center justify-center mb-6 shadow-2xl">
          <Text className="text-white font-serif text-4xl italic">K</Text>
        </View>
        <Text className="text-4xl font-serif italic text-[#FDFBF7] mb-2 tracking-tighter">Kindred</Text>
        <Text className="text-[#FDFBF766] font-bold tracking-[6px] uppercase text-[10px]">Shared Memory Vault</Text>
      </View>
    </View>
  );
}
