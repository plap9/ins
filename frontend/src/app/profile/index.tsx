import { View, Text, Image, FlatList, TouchableOpacity, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, usePathname } from "expo-router";
import StoryList from "~/components/StoryList";
import { useState } from "react";
import ProfilePostList from "~/components/ProfilePostList";
import { Feather, Ionicons, MaterialIcons, Fontisto, AntDesign } from '@expo/vector-icons';
import DiscoverPersonItem, { Person } from "~/components/DiscoverPerson";
import * as Clipboard from 'expo-clipboard';


// Giả lập dữ liệu cho phần stories:
const storiesdata = [
  {
    id: "1",
    image: "https://www.atakinteractive.com/hubfs/react-native%20%281%29.png",
    title: "React-Native",
    isHighlight: true,
  },
  {
    id: "2",
    image: "https://nativewind.dev/img/og-image.png",
    title: "Nativewind",
    isHighlight: true,
  },
];

// Giả lập dữ liệu cho phần discover people:
export const discoverPeopleData: Person[] = [
  {
    id: "1",
    name: "john_doe123",
    image: "https://randomuser.me/api/portraits/men/32.jpg",
    mutualFriends: 7,
  },
  {
    id: "2",
    name: "jane_smith",
    image: "https://randomuser.me/api/portraits/women/44.jpg",
    mutualFriends: 3,
  },
  {
    id: "3",
    name: "robert_johnson",
    image: "https://randomuser.me/api/portraits/men/45.jpg",
    mutualFriends: 8,
  },
  {
    id: "4",
    name: "emily_wilson",
    image: "https://randomuser.me/api/portraits/women/22.jpg",
    mutualFriends: 2,
  },
  {
    id: "5",
    name: "michael_brown",
    image: "https://randomuser.me/api/portraits/men/67.jpg",
    mutualFriends: 4,
  },
];



export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<"posts" | "reels" | "tags">("posts");
  const [showDiscoverPeople, setShowDiscoverPeople] = useState(false);
  const router = useRouter();
  const username = "username_123";

  //logic component DiscoverPeople
  const [discoverPeople, setDiscoverPeople] = useState<Person[]>(discoverPeopleData);
  const handleRemovePerson = (id: string) => {
  setDiscoverPeople(current => current.filter(person => person.id !== id));
  };

  const pathname = usePathname();

  const handleShare = async () => {
    const fullUrl = `http://localhost:8081/${pathname}`;
    await Clipboard.setStringAsync(fullUrl);
    alert('Đường dẫn đã được copy vào clipboard!');
  };

  return (
    <View>
      {/* Header */}
      <View className="bg-white flex-row items-center justify-between px-4 py-2 border-b border-gray-200">
        {/* Username (left side) */}
        <TouchableOpacity onPress={() => alert("Username pressed")}>
          <View className="flex-row items-center">
            <Text className="text-xl font-bold">{username}</Text>
            <Ionicons name="chevron-down" size={20} color="black" style={{ marginLeft: 5 }} />
          </View>
        </TouchableOpacity>
        
        {/* Buttons (right side) */}
        <View className="flex-row items-center">
          <TouchableOpacity 
            className="mr-5" 
            onPress={() => router.push("/profile/create")}
          >
            <Feather name="plus-square" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.push("/profile/settingsscreen")}
          >
            <Feather name="menu" size={24} color="black" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View className="bg-white p-4">
        <StatusBar style="auto" />
        
            {/* Avatar */}
        <View className="flex-row items-center mb-4">
          <Image
            source={{ uri: "https://cdn-useast1.kapwing.com/static/templates/spider-man-triple-meme-template-full-a9a8b78a.webp" }}
            className="w-20 h-20 rounded-full border border-gray-300 overflow-hidden"
            style={{ aspectRatio: 1 }}
          />
          <View className="flex-1 ml-4">
            {/* Stats */}
            <View className="flex-row justify-between w-full">
              <View className="items-center flex-1">
                <Text className="text-lg font-bold">120</Text>
                <Text className="text-gray-500 text-xs">Posts</Text>
              </View>
              <View className="items-center flex-1">
                <Text className="text-lg font-bold">5.2K</Text>
                <Text className="text-gray-500 text-xs">Followers</Text>
              </View>
              <View className="items-center flex-1">
                <Text className="text-lg font-bold">320</Text>
                <Text className="text-gray-500 text-xs">Following</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Username and Bio */}
        <View className="mb-4">
          <Text className="text-lg font-bold">Username</Text>
          <Text className="text-gray-500">Bio or short description</Text>
        </View>

        {/* Story */}
        <StoryList stories={storiesdata} />
        
        {/* Buttons */}
        <View className="flex-row justify-between mb-4" >
          <TouchableOpacity className="flex-1 bg-gray-200 p-2 rounded-lg mr-2" onPress={() => router.push("/profile/update")}>
            <Text className="text-center text-black font-semibold">Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-gray-200 p-2 rounded-lg mr-2" onPress={handleShare}>
            <Text className="text-center text-black font-semibold">Share profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="bg-gray-200 p-2 rounded-lg items-center justify-center w-12" 
            onPress={() => setShowDiscoverPeople(!showDiscoverPeople)}
          >
            <AntDesign name="addusergroup" size={20} color="black" />
          </TouchableOpacity>
        </View>
        
        {/* Discover People Section - Only visible when button is pressed */}
        {showDiscoverPeople && (
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="font-bold text-base">Discover people</Text>
            </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {discoverPeople.map(person => (
                  <DiscoverPersonItem 
                    key={person.id} 
                    suggested={person} 
                    removePerson={handleRemovePerson} 
                  />
                ))}
              </ScrollView>
          </View>
        )}
        
        {/* Pagination */}
        {/* 3 button: Posts, Reels, Tags */}
        <View className="flex-row">
          <TouchableOpacity
            onPress={() => setActiveTab("posts")}
            className="flex-1 items-center py-2"
          >
            <Fontisto 
              name="nav-icon-grid" 
              size={22} 
              color={activeTab === "posts" ? "black" : "#AAAAAA"} 
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("reels")}
            className="flex-1 items-center py-2"
          >
            <MaterialIcons 
              name="video-collection" 
              size={24} 
              color={activeTab === "reels" ? "black" : "#AAAAAA"} 
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("tags")}
            className="flex-1 items-center py-2"
          >
            <Fontisto 
              name="hashtag" 
              size={22} 
              color={activeTab === "tags" ? "black" : "#AAAAAA"} 
            />
          </TouchableOpacity>
        </View>
        
        <View className="w-full">  
          <ProfilePostList activeTab={activeTab}/>
        </View>   
         
      </View>
    </View>
  );
}