import React from "react";
import { View, Text, TextInput, FlatList, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, Heart, MoreVertical } from "lucide-react-native";

const exploreImages = [
  "https://cdn-useast1.kapwing.com/static/templates/spider-man-triple-meme-template-full-a9a8b78a.webp",
  "https://cdn-useast1.kapwing.com/static/templates/spider-man-triple-meme-template-full-a9a8b78a.webp",
  "https://cdn-useast1.kapwing.com/static/templates/spider-man-triple-meme-template-full-a9a8b78a.webp",
  "https://cdn-useast1.kapwing.com/static/templates/spider-man-triple-meme-template-full-a9a8b78a.webp",
  "https://cdn-useast1.kapwing.com/static/templates/spider-man-triple-meme-template-full-a9a8b78a.webp",
  "https://cdn-useast1.kapwing.com/static/templates/spider-man-triple-meme-template-full-a9a8b78a.webp",
  "https://cdn-useast1.kapwing.com/static/templates/spider-man-triple-meme-template-full-a9a8b78a.webp",
  "https://cdn-useast1.kapwing.com/static/templates/spider-man-triple-meme-template-full-a9a8b78a.webp",
  "https://cdn-useast1.kapwing.com/static/templates/spider-man-triple-meme-template-full-a9a8b78a.webp",
  "https://cdn-useast1.kapwing.com/static/templates/spider-man-triple-meme-template-full-a9a8b78a.webp",
  "https://cdn-useast1.kapwing.com/static/templates/spider-man-triple-meme-template-full-a9a8b78a.webp",
  "https://cdn-useast1.kapwing.com/static/templates/spider-man-triple-meme-template-full-a9a8b78a.webp",
  
];

const SearchScreen = () => {
  return (
    <SafeAreaView className=" bg-white " >
      {/* Thanh tìm kiếm */}
      <View className="flex-row items-center px-4 py-2 border-b border-gray-200 flex-11 ">
        <View className="flex-1 bg-gray-100 flex-row items-center px-3 py-2 rounded-full">
          <Search size={20} className="text-gray-500 mr-2" />
          <TextInput
            placeholder="Tìm kiếm"
            placeholderTextColor="#aaa"
            className="flex-1 text-black"
          />
        </View>
      </View>

      {/* Lưới ảnh */}
      <View style={{flexDirection:"row", flexWrap:"wrap", justifyContent:"space-between"}}>
        <FlatList
          data={exploreImages}
          numColumns={3}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity className="w-1/3 p-[0.5] relative">
              <Image source={{ uri: item }} className="w-full aspect-square" />
              <View className="absolute top-1 right-1">
                <MoreVertical size={16} className="text-white" />
              </View>
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
      />
      </View>
      
    </SafeAreaView>
  );
};

export default SearchScreen;
