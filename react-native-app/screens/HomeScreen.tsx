import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { Plus, Home, User } from 'lucide-react-native';
import { format } from 'date-fns';

export default function HomeScreen({ navigation }: any) {
  const user = { displayName: 'Sarah', photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' };
  const mockAlbums = [
    { 
      id: '1', 
      title: 'Lan & Minh Wedding', 
      eventDate: new Date(), 
      photoCount: 432, 
      coverPhotoURL: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=400' 
    }
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#FDFBF7]">
      {/* Glow Blobs equivalent in RN usually uses Absolute View with blur or SVG */}
      <View className="p-8 pb-4 flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-serif text-[#2D2D2D]">Good morning,</Text>
          <Text className="text-3xl font-serif text-[#E89E82] italic">Sarah</Text>
        </View>
        <TouchableOpacity 
          onPress={() => navigation.navigate('Profile')}
          className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-[#2D2D2D0D]"
        >
          <Image source={{ uri: user.photoURL }} className="w-full h-full" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 pt-8 pb-32">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-[10px] font-bold uppercase tracking-[3px] text-[#8C8C8C]">Your Memories</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CreateAlbum')}>
            <Plus size={20} color="#8C8C8C" />
          </TouchableOpacity>
        </View>

        {mockAlbums.map((album) => (
          <TouchableOpacity 
            key={album.id}
            onPress={() => navigation.navigate('AlbumDetail', { album })}
            className="mb-10 relative"
          >
            <View className="absolute inset-0 bg-[#2D2D2D0D] rounded-[40px] translate-x-2 translate-y-2" />
            <View className="relative aspect-[4/5] rounded-[40px] overflow-hidden shadow-2xl border border-white/40 bg-gray-100">
              <Image source={{ uri: album.coverPhotoURL }} className="w-full h-full" />
              <View className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <View className="absolute bottom-8 left-8 right-8">
                <Text className="text-2xl font-serif text-white mb-2">{album.title}</Text>
                <Text className="text-[10px] font-bold text-white uppercase tracking-widest opacity-80">
                  {format(album.eventDate, 'MMM d, yyyy')} • {album.photoCount} Moments
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Navigation */}
      <View className="absolute bottom-8 left-[7.5%] w-[85%] h-20 bg-[#2D2D2D] rounded-[40px] flex-row items-center justify-around px-8 shadow-2xl">
        <TouchableOpacity>
          <Home size={24} color="#E89E82" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => navigation.navigate('CreateAlbum')}
          className="w-12 h-12 bg-white items-center justify-center rounded-2xl shadow-lg ring-4 ring-white/10"
        >
          <Plus size={28} color="#2D2D2D" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <User size={24} color="#FDFBF766" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
