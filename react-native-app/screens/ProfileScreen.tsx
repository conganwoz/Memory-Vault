import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { Settings, Plus, Sparkles, Home, User, Layers, ImageIcon, Users, Calendar, ChevronRight, Shield, Bell, Bookmark, Moon, HelpCircle, LogOut } from 'lucide-react-native';

export default function ProfileScreen({ navigation }: any) {
  const user = { displayName: 'Sarah Parker', photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', createdAt: new Date() };

  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7]">
      <ScrollView className="flex-1">
        <View className="p-8 pb-4 flex-row justify-between items-center">
          <Text className="text-xl font-serif italic text-[#2D2D2D]">My Memory Vault</Text>
          <TouchableOpacity className="p-3 bg-white rounded-2xl border border-[#2D2D2D0D] shadow-sm">
            <Settings size={20} color="#2D2D2D" />
          </TouchableOpacity>
        </View>

        <View className="items-center mt-6 mb-12">
          <View className="w-32 h-32 rounded-[40px] overflow-hidden shadow-2xl bg-white relative">
            <Image source={{ uri: user.photoURL }} className="w-full h-full" />
            <View className="absolute -bottom-1 -right-1 w-10 h-10 bg-[#E89E82] rounded-2xl items-center justify-center border-4 border-white">
              <Sparkles size={16} color="white" fill="white" />
            </View>
          </View>
          <Text className="text-3xl font-serif text-[#2D2D2D] mt-6 mb-2">{user.displayName}</Text>
          <Text className="text-[10px] font-bold uppercase tracking-[3px] text-[#8C8C8C]">
            Preserving frames since 2026
          </Text>
        </View>

        <View className="px-8 space-y-4 flex-row flex-wrap justify-between">
          {[
            { label: 'Albums', value: 12, icon: Layers, color: 'bg-[#E89E821A] text-[#E89E82]' },
            { label: 'Moments', value: 428, icon: ImageIcon, color: 'bg-[#2D2D2D0D] text-[#2D2D2D]' },
            { label: 'Friends', value: 37, icon: Users, color: 'bg-[#2D2D2D0D] text-[#2D2D2D]' },
            { label: 'Years', value: 2, icon: Calendar, color: 'bg-[#2D2D2D0D] text-[#2D2D2D]' },
          ].map((stat, i) => (
            <View key={stat.label} className="w-[48%] bg-white p-5 rounded-[32px] border border-[#2D2D2D0D] shadow-sm mb-4">
               <View className={`w-10 h-10 rounded-2xl items-center justify-center mb-3 ${stat.color}`}>
                  <stat.icon size={20} color={stat.color.includes('E89E82') ? '#E89E82' : '#2D2D2D'} />
               </View>
               <Text className="text-2xl font-serif text-[#2D2D2D]">{stat.value}</Text>
               <Text className="text-[10px] font-bold uppercase tracking-widest text-[#8C8C8C]">{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Recent Section (polaroid style) */}
        <View className="px-8 mt-10">
           <View className="flex-row items-center justify-between mb-6">
              <Text className="text-[10px] font-bold uppercase tracking-[3px] text-[#8C8C8C]">Recently Revisited</Text>
           </View>
           <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-8 px-8">
              {[1, 2].map(i => (
                <View key={i} className="w-64 bg-white p-4 rounded-3xl shadow-xl mr-6 border border-[#2D2D2D0D]">
                  <Image source={{ uri: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=400' }} className="w-full aspect-[4/3] rounded-2xl mb-4" />
                  <Text className="text-lg font-serif text-[#2D2D2D]">Lan & Minh Wedding</Text>
                  <Text className="text-[10px] font-bold text-[#8C8C8C] uppercase mt-1 italic">Oct 12, 2024</Text>
                </View>
              ))}
           </ScrollView>
        </View>

        <View className="px-8 py-12 pb-32">
          <TouchableOpacity className="w-full flex-row items-center justify-center bg-[#212121] p-5 rounded-[32px] shadow-2xl">
            <LogOut size={16} color="white" />
            <Text className="text-white text-[10px] font-bold uppercase tracking-[3px] ml-3">Sign Out of Kindred</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Navigation */}
      <View className="absolute bottom-8 left-[7.5%] w-[85%] h-20 bg-[#2D2D2D] rounded-[40px] flex-row items-center justify-around px-8 shadow-2xl">
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Home size={24} color="#FDFBF766" />
        </TouchableOpacity>
        <TouchableOpacity className="w-12 h-12 bg-white items-center justify-center rounded-2xl shadow-lg ring-4 ring-white/10">
          <Plus size={28} color="#2D2D2D" />
        </TouchableOpacity>
        <TouchableOpacity>
          <User size={24} color="#E89E82" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
