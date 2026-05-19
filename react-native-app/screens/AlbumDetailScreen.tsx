import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, SafeAreaView, Dimensions } from 'react-native';
import { ChevronLeft, Share2, MoreVertical, Plus, Sparkles, Upload } from 'lucide-react-native';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

export default function AlbumDetailScreen({ route, navigation }: any) {
  const { album } = route.params || { album: { title: 'Lan & Minh Wedding', coverPhotoURL: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=600', eventDate: new Date(), members: ['Sarah', 'Mike'] } };

  return (
    <View className="flex-1 bg-[#FDFBF7]">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header Photo */}
        <View className="h-[480px] w-full relative">
          <Image source={{ uri: album.coverPhotoURL }} className="w-full h-full" resizeMode="cover" />
          <View className="absolute inset-0 bg-gradient-to-t from-[#FDFBF7] via-transparent to-transparent" />
          
          <SafeAreaView className="absolute top-0 left-0 right-0 p-6 flex-row justify-between items-center">
            <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 bg-black/20 rounded-full items-center justify-center border border-white/20">
              <ChevronLeft size={24} color="white" />
            </TouchableOpacity>
            <View className="flex-row">
              <TouchableOpacity className="w-10 h-10 bg-black/20 rounded-full items-center justify-center border border-white/20 mr-2">
                <Share2 size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity className="w-10 h-10 bg-black/20 rounded-full items-center justify-center border border-white/20">
                <MoreVertical size={20} color="white" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          <View className="absolute bottom-10 left-8 right-8">
            <Text className="text-4xl font-serif text-[#2D2D2D] mb-1">{album.title}</Text>
            <Text className="text-sm font-serif italic text-[#8C8C8C] mb-6">
              {format(album.eventDate, 'MMMM d, yyyy')}
            </Text>
            
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                 <View className="flex-row -space-x-3">
                    {[1, 2, 3].map(i => (
                      <View key={i} className="w-9 h-9 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                        <Image source={{ uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}` }} className="w-full h-full" />
                      </View>
                    ))}
                 </View>
                 <TouchableOpacity onPress={() => navigation.navigate('Invite')} className="w-9 h-9 rounded-full bg-[#E89E82] items-center justify-center ml-2 border-2 border-white">
                    <Plus size={16} color="white" />
                 </TouchableOpacity>
              </View>

              <TouchableOpacity className="bg-[#2D2D2D] px-5 py-2.5 rounded-2xl flex-row items-center">
                <Sparkles size={14} color="#E89E82" fill="#E89E82" />
                <Text className="text-white text-xs font-bold ml-2">AI Story</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Timeline placeholder */}
        <View className="p-8 pb-32 items-center">
           <View className="w-px h-20 bg-[#2D2D2D0D] mb-4" />
           <Text className="text-[10px] font-bold uppercase tracking-[4px] text-[#8C8C8C]">The Ceremony</Text>
           <View className="w-full mt-10 flex-row flex-wrap justify-between">
              <View className="w-[48%] aspect-square bg-gray-100 rounded-3xl mb-4 overflow-hidden">
                 <Image source={{ uri: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=300' }} className="w-full h-full" />
              </View>
              <View className="w-[48%] aspect-[3/4] bg-gray-100 rounded-3xl mb-4 overflow-hidden mt-8">
                 <Image source={{ uri: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=300' }} className="w-full h-full" />
              </View>
           </View>
        </View>
      </ScrollView>

      {/* Upload FAB */}
      <TouchableOpacity 
        onPress={() => navigation.navigate('Upload')}
        className="absolute bottom-10 right-8 w-16 h-16 bg-[#2D2D2D] rounded-full items-center justify-center shadow-2xl ring-4 ring-[#E89E821A]"
      >
        <Upload size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}
