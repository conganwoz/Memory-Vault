import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { Chrome } from 'lucide-react-native';

export default function LoginScreen({ navigation }: any) {
  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7] items-center justify-center px-10">
      <View className="mb-12 items-center">
        <View className="w-14 h-14 bg-[#E89E82] rounded-2xl items-center justify-center mb-10 shadow-2xl">
          <Text className="text-white font-serif text-3xl italic">K</Text>
        </View>
        <Text className="text-4xl font-serif text-[#2D2D2D] mb-4 italic text-center">Welcome Home</Text>
        <Text className="text-[#8C8C8C] text-center leading-relaxed text-sm max-w-[280px]">
          Invite your loved ones and start building your shared story, one frame at a time.
        </Text>
      </View>

      <TouchableOpacity 
        onPress={() => navigation.replace('Home')}
        className="w-full bg-[#2D2D2D] flex-row items-center justify-center py-5 rounded-[24px] shadow-2xl active:scale-95"
      >
        <Chrome size={20} color="#E89E82" />
        <Text className="text-white font-bold tracking-[3px] uppercase text-[10px] ml-3">
          Continue with Google
        </Text>
      </TouchableOpacity>

      <Text className="mt-12 text-[10px] text-[#8C8C8C] font-bold uppercase tracking-[2px]">
        Designed for Generations
      </Text>
    </SafeAreaView>
  );
}
