import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, usePathname } from 'expo-router';
import {
  AntDesign,
  Fontisto,
  Feather,
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons
} from '@expo/vector-icons';
import { StatusBar } from "expo-status-bar";
import * as Clipboard from 'expo-clipboard';
import StoryList from '~/components/StoryList';
import DiscoverPersonItem, { Person } from '~/components/DiscoverPerson';
import { searchUsers } from '~/services/searchService';
import ProfilePostList from "~/components/ProfilePostList";
import * as userService from '~/services/userService';
import storyService from '~/services/storyService';
import * as postService from '~/services/postService';

type UserProfileRouteParams = {
  username: string;
}

interface Story {
  id: string;
  image: string;
  title: string;
  isHighlight?: boolean;
}

interface User {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  is_private: boolean;
  posts_count: number;
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

interface Highlight {
  highlight_id: number;
  title: string;
  cover_image_url: string | null;
  story_count: number;
}
interface Post {
  id: number;
  caption: string;
  media: Array<{
    id: number;
    media_url: string;
    media_type: string;
  }>;
  created_at: string;
  user_id: number;
}

const UserProfileScreen = () => {
  const router = useRouter();
  const { username } = useLocalSearchParams<UserProfileRouteParams>();
  const [user, setUser] = useState<User | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [isLoadingHighlights, setIsLoadingHighlights] = useState(false);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      const userResponse = await userService.getUserByUsername(username);

      if (userResponse.success) {
        const userData = userResponse.data || userResponse.user;
        
        if (!userData) {
          throw new Error('Không tìm thấy thông tin người dùng');
        }
        
        const user = {
          id: (userData as any).id?.toString() || (userData as any).user_id?.toString() || '',
          username: (userData as any).username || '',
          full_name: (userData as any).full_name || '',
          avatar_url: (userData as any).avatar_url || (userData as any).profile_picture || '',
          bio: (userData as any).bio || '',
          is_private: !!(userData as any).is_private,
          posts_count: Number((userData as any).posts_count || (userData as any).post_count || 0),
          followers_count: Number((userData as any).followers_count || (userData as any).follower_count || 0),
          following_count: Number((userData as any).following_count || (userData as any).following_count || 0),
          is_following: !!(userData as any).is_following || false
        };
        
        setUser(user);
        
        setIsLoadingHighlights(true);
        try {
          const highlightsResponse = await storyService.getUserHighlights(undefined, username);
          if (Array.isArray(highlightsResponse)) {
            setHighlights(highlightsResponse);
          }
        } catch (highlightError) {
          console.error('Lỗi khi lấy highlights:', highlightError);
          setHighlights([]);
        }
        setIsLoadingHighlights(false);

        try {
          setIsLoadingPosts(true);
          const userId = Number(user.id);
          
          if (isNaN(userId)) {
            throw new Error('ID người dùng không hợp lệ');
          }
          
          const postsResponse = await postService.getUserPosts(userId);
          if (postsResponse.success && (postsResponse.data || postsResponse.posts)) {
            const postsData = postsResponse.data || postsResponse.posts || [];
            setPosts(postsData.map(post => ({
              id: post.post_id,
              caption: post.content || '',
              media: Array.isArray(post.media_urls) 
                ? post.media_urls.map((url, index) => ({
                    id: index,
                    media_url: url,
                    media_type: Array.isArray(post.media_types) ? post.media_types[index] : 'image'
                  }))
                : [{ id: 0, media_url: post.media_urls as string, media_type: 'image' }],
              created_at: post.created_at,
              user_id: post.user_id
            })));
          }
        } catch (postsError) {
          console.error('Lỗi khi lấy bài viết:', postsError);
          setPosts([]);
        } finally {
          setIsLoadingPosts(false);
        }

        try {
          setIsLoadingSaved(true);
          const userId = Number(user.id);
          
          if (isNaN(userId)) {
            throw new Error('ID người dùng không hợp lệ');
          }
          
          const savedResponse = await postService.getUserPosts(userId);
          if (savedResponse.success && (savedResponse.data || savedResponse.posts)) {
            const savedData = savedResponse.data || savedResponse.posts || [];
            setSavedPosts(savedData.map(post => ({
              id: post.post_id,
              caption: post.content || '',
              media: Array.isArray(post.media_urls) 
                ? post.media_urls.map((url, index) => ({
                    id: index,
                    media_url: url,
                    media_type: Array.isArray(post.media_types) ? post.media_types[index] : 'image'
                  }))
                : [{ id: 0, media_url: post.media_urls as string, media_type: 'image' }],
              created_at: post.created_at,
              user_id: post.user_id
            })));
          }
        } catch (savedError) {
          console.error('Lỗi khi lấy bài viết đã lưu:', savedError);
          setSavedPosts([]);
        } finally {
          setIsLoadingSaved(false);
        }
      } else {
        throw new Error('Không tìm thấy người dùng');
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu:', err);
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [username]);

  const handleFollow = async () => {
    if (!user || !user.id) return;
    
    try {
      setIsLoadingFollow(true);
      const userId = Number(user.id);
      
      if (isNaN(userId)) {
        throw new Error('ID người dùng không hợp lệ');
      }
      
      if (isFollowing) {
        await userService.unfollowUser(userId);
        setIsFollowing(false);
      } else {
        await userService.followUser(userId);
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Lỗi khi thực hiện follow:', err);
    } finally {
      setIsLoadingFollow(false);
    }
  };

  const pathname = usePathname();
  
  const handleShare = async () => {
    const fullUrl = `http://localhost:8081${pathname}`;
    await Clipboard.setStringAsync(fullUrl);
    alert('Đường dẫn đã được copy vào clipboard!');
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0000ff" />
          <Text className="mt-4 text-gray-500">Đang tải thông tin người dùng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user || error) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-lg text-center mb-4">
            {error || "Không tìm thấy người dùng"}
          </Text>
          <TouchableOpacity 
            className="bg-blue-500 py-2 px-4 rounded-lg"
            onPress={() => router.back()}
          >
            <Text className="text-white font-bold">Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-white flex-row items-center justify-between px-4 py-2 border-b border-gray-200">
        {/* Button back */}
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="black" />
        </TouchableOpacity>

        {/* Username */}
        <Text className="text-xl font-bold">{user.username}</Text>
           
        {/* Buttons (right side) */}
        <View className="flex-row items-center">
          <TouchableOpacity className="mr-5">
            <Fontisto name="bell" size={24} color="black" />
          </TouchableOpacity>

          <TouchableOpacity>
            <MaterialCommunityIcons name="dots-horizontal" size={24} color="black" />
          </TouchableOpacity>
        </View>
      </View>
           
      <ScrollView>
        <View className="bg-white p-4">
          <StatusBar style="auto" />
          {/* Avatar and stats */}
          <View className="flex-row items-center mb-4">
            <Image
              source={{ uri: user.avatar_url || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y" }}
              className="w-20 h-20 rounded-full border border-gray-300 overflow-hidden"
              style={{ aspectRatio: 1 }}
            />
            <View className="flex-1 ml-4">
              {/* Stats */}
              <View className="flex-row justify-between w-full">
                <TouchableOpacity className="items-center flex-1">
                  <Text className="text-lg font-bold">{user.posts_count}</Text>
                  <Text className="text-gray-500 text-xs">bài viết</Text>
                </TouchableOpacity>
                <TouchableOpacity className="items-center flex-1">
                  <Text className="text-lg font-bold">{user.followers_count}</Text>
                  <Text className="text-gray-500 text-xs">người theo dõi</Text>
                </TouchableOpacity>
                <TouchableOpacity className="items-center flex-1">
                  <Text className="text-lg font-bold">{user.following_count}</Text>
                  <Text className="text-gray-500 text-xs">đang theo dõi</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Username and Bio */}
          <View className="mb-4">
            <Text className="text-lg font-bold">{user.full_name}</Text>
            {user.bio && <Text className="text-gray-500">{user.bio}</Text>}
          </View>

          {/* Username text with @ */}
          <View className="mb-2">
            <Text className="text-sm font-medium">
              <Text style={{ fontWeight: 'bold' }}>@</Text> {user.username}
            </Text>
          </View>

          {/* Follow/Message buttons */}
          <View className="flex-row mb-4">
            <TouchableOpacity 
              className={`flex-1 py-2 rounded-lg mr-2 ${isFollowing ? 'bg-gray-200' : 'bg-blue-500'}`}
              onPress={handleFollow}
              disabled={isLoadingFollow}
            >
              <Text className={`text-center font-bold ${isFollowing ? 'text-black' : 'text-white'}`}>
                {isLoadingFollow ? 'Đang xử lý...' : (isFollowing ? 'Đang theo dõi' : 'Theo dõi')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 py-2 rounded-lg bg-gray-200">
              <Text className="text-center font-bold">Nhắn tin</Text>
            </TouchableOpacity>
          </View>

          {/* Highlights */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="mb-4"
          >
            {isLoadingHighlights ? (
              <ActivityIndicator size="small" color="#000" />
            ) : highlights.length > 0 ? (
              highlights.map((highlight) => (
                <TouchableOpacity 
                  key={highlight.highlight_id} 
                  className="items-center mr-4"
                >
                  <View className="w-16 h-16 rounded-full border border-gray-300 overflow-hidden mb-1">
                    <Image
                      source={{ uri: highlight.cover_image_url || 'https://via.placeholder.com/80' }}
                      className="w-full h-full"
                    />
                  </View>
                  <Text className="text-xs">{highlight.title}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text className="text-gray-500">Chưa có highlights</Text>
            )}
          </ScrollView>

          {/* Tabs */}
          <View className="flex-row border-t border-gray-200">
            <TouchableOpacity 
              className={`flex-1 items-center py-3 ${activeTab === 'posts' ? 'border-t-2 border-black' : ''}`}
              onPress={() => setActiveTab('posts')}
            >
              <Ionicons 
                name="grid" 
                size={24} 
                color={activeTab === 'posts' ? 'black' : 'gray'} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              className={`flex-1 items-center py-3 ${activeTab === 'saved' ? 'border-t-2 border-black' : ''}`}
              onPress={() => setActiveTab('saved')}
            >
              <Ionicons 
                name="bookmark" 
                size={24} 
                color={activeTab === 'saved' ? 'black' : 'gray'} 
              />
            </TouchableOpacity>
          </View>

          {/* Posts Grid */}
          {isLoadingPosts || isLoadingSaved ? (
            <ActivityIndicator size="large" color="#000" className="my-8" />
          ) : (
            <View className="flex-row flex-wrap">
              {(activeTab === 'posts' ? posts : savedPosts).map((post) => (
                <TouchableOpacity 
                  key={post.id} 
                  className="w-1/3 aspect-square p-0.5"
                  onPress={() => router.push(`/post/${post.id}`)}
                >
                  <Image
                    source={{ uri: post.media[0]?.media_url || 'https://via.placeholder.com/150' }}
                    className="w-full h-full"
                  />
                  {post.media.length > 1 && (
                    <View className="absolute top-2 right-2">
                      <Ionicons name="images" size={16} color="white" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default UserProfileScreen;