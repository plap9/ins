import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
// Mock Video component để thay thế expo-av
const Video = (props: any) => {
  return <Image {...props} />;
};

import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import StoryService, { Story } from '../../services/storyService';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS
} from 'react-native-reanimated';

interface StoryViewerParams {
  storyId: number;
  stories: Story[];
  initialIndex: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 seconds per story

const StoryViewerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { storyId, stories: initialStories, initialIndex = 0 } = route.params as StoryViewerParams;
  
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  
  const progressValue = useSharedValue(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<any>(null);
  
  const currentStory = stories[currentIndex];

  useEffect(() => {
    // Mark story as viewed
    if (currentStory) {
      StoryService.viewStory(currentStory.story_id).catch(console.error);
    }
    
    // Start progress animation
    startProgress();
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentIndex, stories]);

  const startProgress = () => {
    progressValue.value = 0;
    
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    progressValue.value = withTiming(1, { duration: STORY_DURATION }, () => {
      runOnJS(handleNextStory)();
    });
    
    // Safety timeout in case animation completion callback fails
    timerRef.current = setTimeout(() => {
      handleNextStory();
    }, STORY_DURATION + 100);
  };

  const handleNextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // End of stories, go back or fetch next user's stories
      navigation.goBack();
    }
  };

  const handlePreviousStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      // First story, possibly go back or do nothing
      navigation.goBack();
    }
  };

  const handlePressStory = (event: any) => {
    if (isReplying) return;
    
    const { locationX } = event.nativeEvent;
    
    if (locationX < SCREEN_WIDTH * 0.3) {
      handlePreviousStory();
    } else if (locationX > SCREEN_WIDTH * 0.7) {
      handleNextStory();
    } else {
      // Toggle pause
      setIsPaused(!isPaused);
      
      if (isPaused) {
        startProgress();
      } else {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        progressValue.value = withSequence(
          progressValue.value,
          progressValue.value
        );
      }
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const toggleReplyInput = () => {
    setIsReplying(!isReplying);
    setIsPaused(!isReplying);
    
    if (isReplying) {
      startProgress();
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      progressValue.value = withSequence(
        progressValue.value,
        progressValue.value
      );
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || isSendingReply) return;
    
    try {
      setIsSendingReply(true);
      await StoryService.replyToStory(currentStory.story_id, replyText);
      
      setReplyText('');
      setIsReplying(false);
      setIsPaused(false);
      startProgress();
      
      Alert.alert('Thành công', 'Đã gửi phản hồi.');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi phản hồi');
    } finally {
      setIsSendingReply(false);
    }
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  if (!currentStory || isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const isVideo = currentStory.media_url.includes('.mp4') || 
                 currentStory.media_url.includes('.mov');

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />
      
      {/* Story Content */}
      <TouchableOpacity
        activeOpacity={1}
        className="flex-1"
        onPress={handlePressStory}
        disabled={isReplying}
      >
        {isVideo ? (
          <Video
            ref={videoRef}
            source={{ uri: currentStory.media_url }}
            className="flex-1"
            resizeMode="cover"
            shouldPlay={!isPaused}
            isLooping
            isMuted={false}
          />
        ) : (
          <Image 
            source={{ uri: currentStory.media_url }} 
            className="flex-1" 
            resizeMode="cover"
          />
        )}
        
        {/* Overlay Content */}
        <View className="absolute top-0 left-0 right-0 bottom-0">
          {/* Progress Bar */}
          <View className="flex-row px-2 pt-10">
            {stories.map((_, index) => (
              <View key={index} className="flex-1 h-1 bg-gray-500/50 mx-0.5 rounded-full overflow-hidden">
                <Animated.View 
                  className="h-full bg-white"
                  style={[
                    index === currentIndex && progressStyle,
                    index < currentIndex && { width: '100%' }
                  ]}
                />
              </View>
            ))}
          </View>
          
          {/* Header with User Info and Close Button */}
          <View className="flex-row items-center justify-between px-4 pt-4">
            <View className="flex-row items-center">
              <Image 
                source={{ uri: currentStory.profile_picture }} 
                className="w-10 h-10 rounded-full border border-white"
              />
              <View className="ml-3">
                <Text className="text-white font-bold">{currentStory.username}</Text>
                <Text className="text-white text-xs opacity-80">
                  {new Date(currentStory.created_at).toLocaleTimeString([], { 
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
          </View>
          
          {/* Caption if exists */}
          {currentStory.caption ? (
            <View className="absolute bottom-24 left-0 right-0 px-4">
              <Text className="text-white text-base">{currentStory.caption}</Text>
            </View>
          ) : null}
          
          {/* Reply Input */}
          <View className="absolute bottom-0 left-0 right-0 px-4 pb-8">
            {isReplying ? (
              <View className="flex-row items-center bg-white/20 rounded-full px-4 py-2">
                <TextInput
                  className="flex-1 text-white"
                  placeholder="Trả lời..."
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                  value={replyText}
                  onChangeText={setReplyText}
                  autoFocus
                />
                <TouchableOpacity 
                  onPress={handleSendReply}
                  disabled={isSendingReply || !replyText.trim()}
                >
                  {isSendingReply ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="send" size={24} color="white" />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                className="flex-row items-center bg-white/20 rounded-full px-4 py-3"
                onPress={toggleReplyInput}
              >
                <Text className="text-white opacity-70">Trả lời...</Text>
                <Ionicons name="chevron-up" size={20} color="white" style={{ opacity: 0.7 }} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default StoryViewerScreen;