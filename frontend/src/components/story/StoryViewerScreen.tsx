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
  Platform,
  Pressable,
  TouchableWithoutFeedback
} from 'react-native';

import { Ionicons, MaterialIcons, AntDesign, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import StoryService, { Story } from '../../services/storyService';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS
} from 'react-native-reanimated';
import { getAlternativeS3Url, isS3Url, getS3Url, getKeyFromS3Url, config } from '../../utils/config';
import { useAuth } from '../../app/context/AuthContext';

// Video component không được sử dụng đúng cách nên tạm comment lại
// const Video = (props: any) => {
//   return <Image {...props} />;
// };

interface StoryViewerProps {
  storyId: number;
  stories: Story[];
  initialIndex?: number;
  onClose?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION = 10000;

const StoryViewerScreen = ({ 
  storyId, 
  stories: initialStories, 
  initialIndex = 0,
  onClose 
}: StoryViewerProps) => {
  const navigation = useNavigation();
  const { authData } = useAuth();
  
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false); 
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [shouldCompleteCurrentProgress, setShouldCompleteCurrentProgress] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const progressValue = useSharedValue(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<any>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const storyCompleteTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const currentStory = stories[currentIndex];

  useEffect(() => {
    if (currentStory) {
      setImageLoadError(false);
      setIsRetrying(false);
      setRetryCount(0);
      
      const mediaSource = currentStory.media && currentStory.media.length > 0 
        ? currentStory.media[0].media_url 
        : currentStory.media_url;
      
      if (mediaSource) {
        const fullUrl = mediaSource.startsWith('http') 
          ? mediaSource 
          : getS3Url(mediaSource);
        
        setMediaUrl(fullUrl);
      }
    }
  }, [currentStory]);

  const handleImageError = async () => {
    
    if (retryCount >= 3) {
      setImageLoadError(true);
      return;
    }
    
    setRetryCount(retryCount + 1);
    
    if (isRetrying && retryCount > 1) {
      setImageLoadError(true);
      return;
    }
    
    setIsRetrying(true);
    
    try {
      pauseProgress();
      
      if (mediaUrl.includes('?')) {
        const baseUrl = mediaUrl.split('?')[0];
        setMediaUrl(baseUrl);
        resumeProgress();
        return;
      }
      
      if (!authData?.token) {
        setImageLoadError(true);
        resumeProgress();
        return;
      }
      
      const key = getKeyFromS3Url(mediaUrl);
      
      if (retryCount === 1) {
        const directUrl = `https://${config.AWS.S3_BUCKET_NAME}.s3.${config.AWS.REGION}.amazonaws.com/${key}`;
        setMediaUrl(directUrl);
        resumeProgress();
        return;
      }
      
      try {
        const response = await fetch(
          `${config.API_BASE_URL}/stories/presigned-url?key=${encodeURIComponent(key)}`,
          { 
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authData.token}`
            }
          }
        );
        
        if (!response.ok) {
          console.error("Lỗi HTTP khi lấy presigned URL:", response.status);
          setImageLoadError(true);
          resumeProgress();
          return;
        }
        
        const data = await response.json();
        
        if (data.success && data.presignedUrl) {
          let alternativeUrl = data.presignedUrl;
          if (alternativeUrl.includes('&amp;')) {
            alternativeUrl = alternativeUrl.replace(/&amp;/g, '&');
          }
          setMediaUrl(alternativeUrl);
          setImageLoadError(false);
          resumeProgress();
          return;
        }
      } catch (directError) {
        console.error("Lỗi khi gọi API trực tiếp:", directError);
      }
      
      setImageLoadError(true);
    } catch (error) {
      console.error("Lỗi khi lấy URL thay thế:", error);
      setImageLoadError(true);
    } finally {
      resumeProgress();
    }
  };

  const calculateRemainingDuration = (): number => {
    if (progressValue.value === 0) return STORY_DURATION;
    
    const elapsed = progressValue.value * STORY_DURATION;
    const remaining = STORY_DURATION - elapsed;
    
    return Math.max(remaining, 1000);
  };

  const pauseProgress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (storyCompleteTimerRef.current) {
      clearTimeout(storyCompleteTimerRef.current);
      storyCompleteTimerRef.current = null;
    }
    
    progressValue.value = withTiming(progressValue.value, { duration: 0 });
    setIsPaused(true);
  };

  const resumeProgress = () => {
    if (!isReplying && !showOptions) {
      setIsPaused(false);
      const remainingDuration = calculateRemainingDuration();
      
      progressValue.value = withTiming(1, { 
        duration: remainingDuration
      }, () => {
        runOnJS(proceedToNextStory)();
      });
      
      timerRef.current = setTimeout(() => {
        proceedToNextStory();
      }, remainingDuration + 500);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (navigation) {
      navigation.goBack();
    }
  };

  const completeCurrentStory = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (storyCompleteTimerRef.current) {
      clearTimeout(storyCompleteTimerRef.current);
      storyCompleteTimerRef.current = null;
    }
    
    progressValue.value = withTiming(1, { duration: 300 }, () => {
      runOnJS(proceedToNextStory)();
    });
    
    storyCompleteTimerRef.current = setTimeout(() => {
      proceedToNextStory();
    }, 400);
  };
  
  const proceedToNextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleClose();
    }
  };

  const handleLongPressStart = () => {
    setIsLongPressed(true);
    pauseProgress();
  };

  const handleLongPressEnd = () => {
    if (isLongPressed) {
      setIsLongPressed(false);
      
      if (!isReplying && !showOptions) {
        resumeProgress();
      }
    }
  };

  const toggleReplyInput = () => {
    setIsReplying(!isReplying);
    setIsPaused(!isReplying);
    
    if (isReplying) {
      startProgress();
    } else {
      pauseProgress();
    }
  };

  const handleLike = () => {
    pauseProgress();
    
    setIsLiked(!isLiked);
    
    setTimeout(() => {
      resumeProgress();
    }, 300);
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

  const toggleOptions = () => {
    setShowOptions(!showOptions);
    setIsPaused(!isPaused);
    
    if (showOptions) {
      startProgress();
    } else {
      pauseProgress();
    }
  };

  const getTimeLeft = (created_at: string, expires_at: string) => {
    const now = new Date();
    const created = new Date(created_at);
    
    const hoursPassed = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (hoursPassed < 1) {
      return "0h";
    } else if (hoursPassed < 24) {
      return `${hoursPassed}h`;
    } else {
      return "24h";
    }
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (storyCompleteTimerRef.current) {
      clearTimeout(storyCompleteTimerRef.current);
      storyCompleteTimerRef.current = null;
    }

    if (currentStory && !currentStory.is_viewed) {
      StoryService.viewStory(currentStory.story_id)
        .then((response) => {
          const updatedStories = [...stories];
          updatedStories[currentIndex] = {
            ...updatedStories[currentIndex],
            is_viewed: true,
            view_count: response?.view_count || updatedStories[currentIndex].view_count
          };
          setStories(updatedStories);
        })
        .catch(error => {
          console.error(`Lỗi khi đánh dấu đã xem story ID ${currentStory.story_id}:`, error);
          const updatedStories = [...stories];
          updatedStories[currentIndex] = {
            ...updatedStories[currentIndex],
            is_viewed: true
          };
          setStories(updatedStories);
        });
    }
    
    setIsLiked(false);
    setIsPaused(false);
    setIsLongPressed(false);
    setIsReplying(false);
    setShowOptions(false);
    setShouldCompleteCurrentProgress(false);
    
    progressValue.value = 0;
    
    const timer = setTimeout(() => {
      startProgress();
    }, 100);
    
    return () => {
      clearTimeout(timer);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (storyCompleteTimerRef.current) {
        clearTimeout(storyCompleteTimerRef.current);
        storyCompleteTimerRef.current = null;
      }
    };
  }, [currentIndex, stories]);

  if (!currentStory || isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const mediaSource = currentStory.media && currentStory.media.length > 0 
    ? currentStory.media[0] 
    : { media_url: currentStory.media_url, media_type: 'image' };
    
  const isVideo = mediaSource.media_type === 'video' || 
                mediaSource.media_url?.includes('.mp4') || 
                mediaSource.media_url?.includes('.mov');

  const handleLeftPress = () => {
    if (isLongPressed || isReplying || showOptions) return;
    
    if (currentIndex > 0) {
      progressValue.value = 0;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setCurrentIndex(currentIndex - 1);
    } else {
      handleClose();
    }
  };

  const handleRightPress = () => {
    if (isLongPressed || isReplying || showOptions) return;
    
    if (currentIndex < stories.length - 1) {
      progressValue.value = 0;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setCurrentIndex(currentIndex + 1);
    } else {
      handleClose();
    }
  };

  const startProgress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (storyCompleteTimerRef.current) {
      clearTimeout(storyCompleteTimerRef.current);
      storyCompleteTimerRef.current = null;
    }
    
    if (shouldCompleteCurrentProgress) {
      completeCurrentStory();
      setShouldCompleteCurrentProgress(false);
      return;
    }
    
    const remainingDuration = calculateRemainingDuration();
    
    progressValue.value = withTiming(1, { 
      duration: remainingDuration
    }, (finished) => {
      if (finished && !isLongPressed) {
        runOnJS(proceedToNextStory)();
      }
    });
    
    timerRef.current = setTimeout(() => {
      if (!isLongPressed) {
        proceedToNextStory();
      }
    }, remainingDuration + 500)
  };

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />
      
      {/* Story Content */}
      <View className="flex-1">
        {isVideo ? (
          <View className="w-full h-[85%] flex-1">
            {mediaUrl ? (
              <Image
                source={{ uri: mediaUrl }}
                className="flex-1"
                resizeMode="contain"
                onLoadStart={() => {
                }}
                onLoadEnd={() => {
                }}
                onLoad={() => {
                  setImageLoadError(false);
                }}
                onError={(e) => {
                  handleImageError();
                }}
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#ffffff" />
              </View>
            )}
            {imageLoadError && (
              <View className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center">
                <Text className="text-white text-base">Không thể tải video</Text>
              </View>
            )}
          </View>
        ) : (
          <View className="w-full h-[85%] flex-1">
            {mediaUrl ? (
              <Image 
                source={{ uri: mediaUrl }} 
                className="flex-1"
                resizeMode="contain"
                onLoadStart={() => {
                }}
                onLoadEnd={() => {
                }}
                onLoad={() => {
                  setImageLoadError(false);
                }}
                onError={(e) => {
                  handleImageError();
                }}
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#ffffff" />
              </View>
            )}
            {imageLoadError && (
              <View className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center">
                <Text className="text-white text-base">Không thể tải hình ảnh</Text>
              </View>
            )}
          </View>
        )}
          
        {/* Overlay Content */}
        <View className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
          {/* Progress Bar - Hiển thị thanh tiến trình cho tất cả story của người dùng hiện tại */}
          <View className="flex-row px-2 pt-10">
            {stories.map((story, index) => (
              <View key={index} className="flex-1 h-1 bg-gray-500/50 mx-0.5 rounded-full overflow-hidden">
                <Animated.View 
                  className="h-full bg-white"
                  style={[
                    index === currentIndex && progressStyle,
                    index < currentIndex && { width: '100%' },
                    index > currentIndex && { width: '0%' }
                  ]}
                />
              </View>
            ))}
          </View>
          
          {/* Header with User Info and Close Button */}
          <View className="flex-row items-center justify-between px-4 pt-4 pointer-events-auto">
            <View className="flex-row items-center">
              <Image 
                source={{ uri: currentStory.username && currentStory.profile_picture 
                  ? currentStory.profile_picture 
                  : 'https://via.placeholder.com/150'
                }} 
                className="w-10 h-10 rounded-full border border-white bg-transparent"
              />
              <View className="ml-3">
                <Text className="text-white font-bold">{currentStory.username || "Người dùng"}</Text>
                <Text className="text-white text-xs opacity-80">
                  {getTimeLeft(currentStory.created_at, currentStory.expires_at)}
                </Text>
              </View>
            </View>
            
            <View className="flex-row items-center">
              <TouchableOpacity onPress={toggleOptions} className="mr-4">
                <Feather name="more-horizontal" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Options Menu */}
          {showOptions && (
            <View className="absolute top-24 right-4 bg-gray-800 rounded-lg py-2 px-1 z-50 pointer-events-auto">
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3"
                onPress={() => {
                  toggleOptions();
                  Alert.alert("Ẩn story", "Đã ẩn story này");
                }}
              >
                <Feather name="eye-off" size={20} color="white" />
                <Text className="text-white ml-2">Ẩn story</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-row items-center px-4 py-3"
                onPress={() => {
                  toggleOptions();
                  Alert.alert("Báo cáo", "Đã gửi báo cáo");
                }}
              >
                <Feather name="flag" size={20} color="white" />
                <Text className="text-white ml-2">Báo cáo</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Caption if exists - Caption là thông tin văn bản cho story */}
          {currentStory.has_text && (
            <View className="absolute bottom-44 left-0 right-0 px-4">
              <Text className="text-white text-base">{currentStory.sticker_data || ''}</Text>
            </View>
          )}
        </View>
          
        {/* Interaction Area - Positioned at the bottom */}
        <View className="absolute bottom-0 left-0 right-0 bg-black/60 pt-2 pb-6 px-4">
          {/* Hiển thị số lượt xem phía trên */}
          <View className="items-end mb-2">
            <Text className="text-white text-xs opacity-70">
              {currentStory.view_count || 0} lượt xem
            </Text>
          </View>
          
          {/* Reply Input và nút Like nằm song song */}
          {isReplying ? (
            <View className="flex-1 flex-row items-center bg-white/20 rounded-full px-4 py-2">
              <TextInput
                className="flex-1 text-white"
                placeholder="Trả lời..."
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={replyText}
                onChangeText={setReplyText}
                autoFocus
              />
              <TouchableOpacity 
                onPress={handleLike} 
                className="mx-2 h-10 w-10 items-center justify-center"
              >
                <AntDesign 
                  name={isLiked ? "heart" : "hearto"} 
                  size={24} 
                  color={isLiked ? "#FF3040" : "white"} 
                />
              </TouchableOpacity>
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
            <View className="flex-1 flex-row items-center">
              <TouchableOpacity
                className="flex-1 flex-row items-center bg-white/20 rounded-full px-4 py-3"
                onPress={toggleReplyInput}
              >
                <Text className="text-white opacity-70">Trả lời...</Text>
                <View className="flex-1" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleLike} 
                className="ml-2 h-12 w-12 items-center justify-center"
              >
                <AntDesign 
                  name={isLiked ? "heart" : "hearto"} 
                  size={28} 
                  color={isLiked ? "#FF3040" : "white"} 
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Gesture areas for left and right navigation AND long press */}
      <View className="absolute top-0 bottom-0 left-0 right-0 flex-row z-20">
        {/* Left area - go to previous story */}
        <TouchableWithoutFeedback 
          onPress={handleLeftPress}
          onLongPress={handleLongPressStart}
          onPressOut={handleLongPressEnd}
          delayLongPress={200}
        >
          <View className="flex-1" />
        </TouchableWithoutFeedback>
        
        {/* Right area - go to next story */}
        <TouchableWithoutFeedback 
          onPress={handleRightPress}
          onLongPress={handleLongPressStart}
          onPressOut={handleLongPressEnd}
          delayLongPress={200}
        >
          <View className="flex-1" />
        </TouchableWithoutFeedback>
      </View>
    </View>
  );
};

export default StoryViewerScreen;