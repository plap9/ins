import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  TouchableWithoutFeedback,
  SafeAreaView,
  Keyboard
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
  runOnJS,
  cancelAnimation,
  withSpring,
  Easing
} from 'react-native-reanimated';
import { getAlternativeS3Url, isS3Url, getS3Url, getKeyFromS3Url, config } from '../../utils/config';
import { useAuth } from '../../app/context/AuthContext';
import { Video, ResizeMode } from 'expo-av';

interface StoryViewerProps {
  storyId: number;
  stories: Story[];
  initialIndex?: number;
  onClose?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DEFAULT_STORY_DURATION = 10000; 

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
  const [completedStories, setCompletedStories] = useState<number[]>([]);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const scaleAnim = useSharedValue(0);
  const opacityAnim = useSharedValue(0);
  
  const progressValue = useSharedValue(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<any>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const storyCompleteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput>(null);
  const animationRef = useRef<any>(null);
  
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
          if (alternativeUrl.includes('&')) {
            alternativeUrl = alternativeUrl.replace(/&/g, '&');
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
    const totalDuration = isVideo && videoDuration > 0 ? videoDuration : DEFAULT_STORY_DURATION;
    
    if (progressValue.value === 0) return totalDuration;
    
    const elapsed = progressValue.value * totalDuration;
    const remaining = totalDuration - elapsed;
    
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
    
    cancelAnimation(progressValue);
    progressValue.value = progressValue.value;
    setIsPaused(true);
  };

  const resumeProgress = () => {
    if (!isReplying && !showOptions) {
      setIsPaused(false);
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
      }, remainingDuration + 200);
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
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    cancelAnimation(progressValue);
    
    if (currentIndex < stories.length - 1) {
      setIsVideoReady(false);
      setVideoDuration(0);
      progressValue.value = 0;
      
      setCurrentIndex(currentIndex + 1);
    } else {
      handleClose();
    }
  };

  const handleLongPressStart = () => {
    setIsLongPressed(true);
    pauseProgress();
    
    if (isVideo && videoRef.current) {
      try {
        videoRef.current.pauseAsync();
      } catch (error) {
        console.error("Lỗi khi pause video:", error);
      }
    }
  };

  const handleLongPressEnd = () => {
    if (isLongPressed) {
      setIsLongPressed(false);
      
      if (!isReplying && !showOptions) {
        resumeProgress();
        
        if (isVideo && videoRef.current && !isPaused) {
          try {
            videoRef.current.playAsync();
          } catch (error) {
            console.error("Lỗi khi play video:", error);
          }
        }
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
    
    if (!isLiked) {
      setShowLikeAnimation(true);
      scaleAnim.value = 0;
      opacityAnim.value = 0;
      
      scaleAnim.value = withSequence(
        withTiming(0.5, { duration: 0 }),
        withTiming(1.2, { duration: 200 }),
        withTiming(1, { duration: 200 })
      );
      
      opacityAnim.value = withTiming(1, { duration: 200 });
      
      setTimeout(() => {
        opacityAnim.value = withTiming(0, { duration: 300 });
        setTimeout(() => {
          setShowLikeAnimation(false);
        }, 300);
      }, 1000);
    }
    
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
      
      if (isVideo && videoRef.current && !isPaused) {
        try {
          videoRef.current.playAsync();
        } catch (error) {
          console.error("Lỗi khi play video:", error);
        }
      }
      
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
      if (isVideo && videoRef.current && !isPaused) {
        try {
          videoRef.current.playAsync();
        } catch (error) {
          console.error("Lỗi khi play video:", error);
        }
      }
      startProgress();
    } else {
      if (isVideo && videoRef.current) {
        try {
          videoRef.current.pauseAsync();
        } catch (error) {
          console.error("Lỗi khi pause video:", error);
        }
      }
      pauseProgress();
    }
  };

  const getTimeLeft = (created_at: string, expires_at: string) => {
    const now = new Date();
    const created = new Date(created_at);
    const expires = new Date(expires_at);
    
    const hoursPassed = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (hoursPassed <= 0) {
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
    setIsVideoReady(false);
    setIsBuffering(true);
    
    cancelAnimation(progressValue);
    progressValue.value = 0;
    
    if (!isVideo) {
      const timer = setTimeout(() => {
        startProgress();
      }, 100);
      return () => clearTimeout(timer);
    }
    
    return () => {
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
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      
      cancelAnimation(progressValue);
      progressValue.value = 0;
      
      setIsVideoReady(false);
      setVideoDuration(0);
      
      setCurrentIndex(currentIndex - 1);
    } else {
      handleClose();
    }
  };

  const handleRightPress = () => {
    if (isLongPressed || isReplying || showOptions) return;
    
    if (currentIndex < stories.length - 1) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      
      cancelAnimation(progressValue);
      progressValue.value = 0;
      
      setIsVideoReady(false);
      setVideoDuration(0);
      
      setCurrentIndex(currentIndex + 1);
    } else {
      handleClose();
    }
  };

  const handleReply = () => {
    setIsReplying(true);
    setIsPaused(true);
    pauseProgress();
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
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
    const totalDuration = isVideo && videoDuration > 0 ? videoDuration : DEFAULT_STORY_DURATION;
    
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
    }, remainingDuration + 200)
  };

  const handleAnimationComplete = useCallback((finished?: boolean) => {
    if (finished) {
      setCompletedStories(prev => [...prev, currentIndex]);
      
      if (currentIndex < stories.length - 1) {
        progressValue.value = 0;
        setCurrentIndex(prev => prev + 1);
      } else {
        handleClose();
      }
    }
  }, [currentIndex, stories.length, handleClose]);

  const handleVideoLoad = useCallback((status: any) => {
    console.log("Video đã load, status:", status);
    try {
      if (status && status.isLoaded && status.durationMillis) {
        const duration = status.durationMillis;
        console.log(`Đã lấy được thời lượng video: ${duration}ms`);
        setVideoDuration(duration);
        setIsVideoReady(true);
        setIsBuffering(status.isBuffering || false);

        progressValue.value = 0;
        
        if (!isPaused && !isLongPressed) {
          startProgress();
        }
      }
    } catch (error) {
      console.error("Lỗi xử lý sự kiện load video:", error);
    }
  }, [isPaused, isLongPressed]);

  const handleVideoUpdate = useCallback((status: any) => {
    try {
      if (status && status.isLoaded) {
        setIsBuffering(status.isBuffering || false);
        
        if (!isPaused && !isLongPressed && status.positionMillis && videoDuration > 0) {
          const progress = status.positionMillis / videoDuration;
          if (status.isPlaying && Math.abs(progress - progressValue.value) > 0.05) {
            progressValue.value = progress;
          }
        }
        
        if (status.didJustFinish) {
          console.log("Video đã kết thúc");
          proceedToNextStory();
        }
      }
    } catch (error) {
      console.error("Lỗi xử lý sự kiện update video:", error);
    }
  }, [proceedToNextStory, isPaused, isLongPressed, videoDuration]);

  const handleRefreshVideo = useCallback(async () => {
    setImageLoadError(false);
    setIsBuffering(true);
    try {
      if (currentStory.media_url) {
        const s3Key = getKeyFromS3Url(currentStory.media_url);
        const newSignedUrl = await StoryService.getPresignedUrl(s3Key);
        setMediaUrl(`${newSignedUrl}&_t=${Date.now()}`);
      }
    } catch (error) {
      console.error("Không thể refresh video:", error);
      setImageLoadError(true);
    }
  }, [currentStory.media_url]);

  const formatTime = useCallback((milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, []);

  useEffect(() => {
    cancelAnimation(progressValue);
    
    progressValue.value = 0;
    
    if (isVideo) {
      if (isVideoReady && !isPaused) {
      }
    } else {
      if (!isPaused) {
        startProgress();
      }
    }
    
    return () => {
      cancelAnimation(progressValue);
    };
  }, [currentIndex, isVideo, isVideoReady, isPaused, progressValue]);

  useEffect(() => {
    if (isVideo && isVideoReady && !isPaused && !isLongPressed) {
      startProgress();
    }
  }, [isVideoReady, isVideo, isPaused, isLongPressed, startProgress]);

  const heartAnimStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleAnim.value }],
      opacity: opacityAnim.value,
    };
  });

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      
      <View className="flex-1">
        <View className="w-full px-2 pt-10 flex-row space-x-0.5 z-10">
          {stories.map((_, index) => (
            <View 
              key={`progress-${index}`} 
              className="flex-1 h-[2px] bg-gray-500/50 rounded-full overflow-hidden"
            >
              {currentIndex === index && (
                <Animated.View
                  className="h-full bg-white rounded-full"
                  style={progressStyle}
                />
              )}
              {(completedStories.includes(index) || index < currentIndex) && (
                <View className="h-full w-full bg-white rounded-full" />
              )}
            </View>
          ))}
        </View>
        
        <View className="flex-row justify-between items-center px-4 py-2">
          <View className="flex-row items-center">
            <Image 
              source={{ 
                uri: currentStory.profile_picture || 'https://via.placeholder.com/40'
              }} 
              className="w-8 h-8 rounded-full" 
            />
            <View className="ml-2">
              <Text className="text-white font-medium">{currentStory.username}</Text>
              <Text className="text-gray-400 text-xs">
                {getTimeLeft(currentStory.created_at, currentStory.expires_at)}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
        </View>
        
        <View className="flex-1 justify-center">
          {isVideo ? (
            <Video
              ref={videoRef}
              source={{ uri: mediaUrl || '' }}
              style={{ width: '100%', height: '100%' }}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={!isPaused && isVideoReady}
              isMuted={false}
              isLooping={false}
              progressUpdateIntervalMillis={100}
              onLoadStart={() => {
                console.log("Video bắt đầu tải");
                setIsBuffering(true);
                setIsVideoReady(false);
              }}
              onLoad={handleVideoLoad}
              onPlaybackStatusUpdate={handleVideoUpdate}
              onError={(error: any) => {
                console.error("Lỗi khi phát video:", error);
                setImageLoadError(true);
                setIsBuffering(false);
                if (!isPaused) {
                  startProgress();
                }
              }}
            />
          ) : (
            <Image 
              source={{ uri: mediaUrl || '' }}
              className="w-full h-full"
              resizeMode={ResizeMode.CONTAIN}
              onLoadStart={() => setIsBuffering(true)}
              onLoad={() => {
                setIsBuffering(false);
                if (!isPaused && !isLongPressed) {
                  cancelAnimation(progressValue);
                  progressValue.value = 0;
                  startProgress();
                }
              }}
              onError={() => {
                setImageLoadError(true);
                setIsBuffering(false);
              }}
            />
          )}

          {isBuffering && !isVideo && !isVideoReady && (
            <View className="absolute inset-0 items-center justify-center bg-black/30">
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}

          {imageLoadError && (
            <View className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Text className="text-white text-center px-4">
                Không thể tải nội dung. Vui lòng thử lại sau.
              </Text>
              <TouchableOpacity 
                className="mt-4 bg-blue-500 px-4 py-2 rounded-lg"
                onPress={handleRefreshVideo}
              >
                <Text className="text-white">Thử lại</Text>
              </TouchableOpacity>
            </View>
          )}

          {showLikeAnimation && (
            <View className="absolute inset-0 items-center justify-center">
              <Animated.View
                className="items-center justify-center"
                style={heartAnimStyle}
              >
                <MaterialIcons name="favorite" size={120} color="#e31b23" />
              </Animated.View>
            </View>
          )}

          {isLiked && !showLikeAnimation && (
            <View className="absolute bottom-24 right-6">
              <MaterialIcons name="favorite" size={40} color="#e31b23" />
            </View>
          )}

          {!isReplying && (
            <View className="absolute inset-0 flex-row">
              <TouchableOpacity 
                activeOpacity={1}
                className="w-1/3 h-full"
                onPress={handleLeftPress}
                onLongPress={handleLongPressStart}
                onPressOut={handleLongPressEnd}
              />
              
              <TouchableOpacity 
                activeOpacity={1}
                className="w-1/3 h-full"
                onPress={toggleOptions}
                onLongPress={handleLongPressStart}
                onPressOut={handleLongPressEnd}
              />
              
              <TouchableOpacity 
                activeOpacity={1}
                className="w-1/3 h-full"
                onPress={handleRightPress}
                onLongPress={handleLongPressStart}
                onPressOut={handleLongPressEnd}
              />
            </View>
          )}

          {showOptions && (
            <View className="absolute inset-0 bg-black/70 items-center justify-center">
              <View className="w-4/5 bg-gray-800 rounded-xl p-4">
                <Text className="text-white text-center text-lg font-medium mb-4">
                  Tùy chọn
                </Text>
                
                <TouchableOpacity 
                  className="flex-row items-center py-3 border-b border-gray-700"
                  onPress={() => {
                    toggleOptions();
                    Alert.alert('Thành công', 'Đã lưu story');
                  }}
                >
                  <Feather name="download" size={20} color="white" />
                  <Text className="text-white ml-3">Lưu story</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className="flex-row items-center py-3 border-b border-gray-700"
                  onPress={() => {
                    toggleOptions();
                    Alert.alert('Đã báo cáo', 'Cảm ơn bạn đã gửi báo cáo');
                  }}
                >
                  <Feather name="flag" size={20} color="white" />
                  <Text className="text-white ml-3">Báo cáo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className="flex-row items-center py-3"
                  onPress={toggleOptions}
                >
                  <Feather name="x" size={20} color="white" />
                  <Text className="text-white ml-3">Đóng</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isReplying && (
            <View className="absolute bottom-0 left-0 right-0 bg-black/90 p-4">
              <View className="flex-row items-center mb-1">
                <Image 
                  source={{ 
                    uri: currentStory.profile_picture || 'https://via.placeholder.com/40'
                  }} 
                  className="w-8 h-8 rounded-full mr-2" 
                />
                <Text className="text-white font-medium">{currentStory.username}</Text>
              </View>
              
              <View className="flex-row items-center mt-2">
                <TextInput
                  ref={inputRef}
                  className="flex-1 bg-transparent border border-white/50 text-white px-4 py-2 rounded-full mr-3"
                  placeholder="Trả lời..."
                  placeholderTextColor="#ffffff99"
                  value={replyText}
                  onChangeText={setReplyText}
                  autoCapitalize="none"
                  multiline
                  maxLength={1000}
                  style={{ maxHeight: 100 }}
                />
                
                <TouchableOpacity 
                  className={`${replyText.trim() ? 'bg-transparent' : 'bg-transparent'} w-10 h-10 rounded-full items-center justify-center`}
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
              
              <TouchableOpacity 
                className="mt-3 self-center bg-transparent px-4 py-2 rounded-lg"
                onPress={() => {
                  setIsReplying(false);
                  setIsPaused(false);
                  setReplyText('');
                  Keyboard.dismiss();
                  resumeProgress();
                }}
              >
                <Text className="text-gray-400 font-medium">Hủy</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!isReplying && (
          <View className="px-4 pb-8 pt-2 flex-row justify-between items-center">
            <TouchableOpacity 
              className="flex-1 mr-3"
              onPress={handleReply}
              activeOpacity={0.8}
            >
              <View className="bg-transparent border border-white/50 px-4 py-4 rounded-full flex-row items-center">
                <Text className="text-white/70">
                  Trả lời {currentStory.username}...
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleLike}
              className="w-10 h-10 items-center justify-center"
            >
              <MaterialIcons 
                name={isLiked ? "favorite" : "favorite-border"} 
                size={28} 
                color={isLiked ? "#e31b23" : "white"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="w-10 h-10 items-center justify-center"
              onPress={() => {
                if (!showOptions) toggleOptions();
              }}
            >
              <Feather name="send" size={24} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default StoryViewerScreen;