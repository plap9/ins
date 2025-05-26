import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    timestamp: string;
    isRead: boolean;
    isSent: boolean;
    isDelivered: boolean;
    isFailed?: boolean;
    queuedMessageId?: string;
    type: 'text' | 'image' | 'video';
    mediaUrl?: string;
    senderId?: string;
    senderName?: string;
  };
  isOwn: boolean;
  showAvatar?: boolean;
  avatar?: string;
  isGroup?: boolean;
  onLongPress?: () => void;
  onMediaPress?: () => void;
  onRetryMessage?: (messageId: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showAvatar = false,
  avatar,
  isGroup = false,
  onLongPress,
  onMediaPress,
  onRetryMessage,
}) => {
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(message.senderName || 'User')}&background=random`;
  
  const avatarSource = { uri: avatar || defaultAvatar };
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(false);
  const [isVideoPreloaded, setIsVideoPreloaded] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const videoRef = useRef<Video | null>(null);

  useEffect(() => {
    return () => {
      setIsPlaying(false);
    };
  }, [message.id]);

  const isVideoMedia = (url?: string): boolean => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.3gp', '.webm'];
    return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
  };

  const formatDuration = (millis: number | null): string => {
    if (millis === null) return '00:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const generateThumbnail = async (videoUrl: string) => {
    if (!videoUrl) return;
    
    try {
      setIsLoadingThumbnail(true);
      
      const { uri } = await VideoThumbnails.getThumbnailAsync(
        videoUrl,
        {
          time: 0,
          quality: 0.7
        }
      );
      
      setThumbnailUri(uri);
    } catch (e) {
      console.error(`[Thumbnail Error] Không thể tạo thumbnail:`, e);
      setThumbnailError(true);
    } finally {
      setIsLoadingThumbnail(false);
    }
  };

  useEffect(() => {
    const preloadVideo = async () => {
      if (message.mediaUrl && isVideoMedia(message.mediaUrl)) {
        if (!thumbnailUri && !thumbnailError) {
          await generateThumbnail(message.mediaUrl);
        }
      }
    };

    preloadVideo();
  }, [message.mediaUrl]);

  // Preload video function
  const handleVideoPlay = async () => {
    if (!message.mediaUrl) return;
    
    try {
      setIsVideoLoading(true);
      setIsPlaying(true);
      
      if (videoRef.current) {
        // Preload và play video
        await videoRef.current.loadAsync(
          { uri: message.mediaUrl },
          { shouldPlay: true },
          false
        );
      }
    } catch (error) {
      console.error('[Video Load Error]:', error);
      setIsPlaying(false);
    }
  };

  const renderMedia = () => {
    const mediaContainerClass = isOwn ? 'self-end' : '';
    
    if (!message.mediaUrl) {
      return null;
    }

    const isVideo = isVideoMedia(message.mediaUrl);
    const maxWidth = 240; // 60 units = 240px
    const maxHeight = 240;

    if (!isVideo) {
      return (
        <TouchableOpacity 
          onPress={onMediaPress} 
          className={`${mediaContainerClass} rounded-xl overflow-hidden mb-1`}
        >
          <Image 
            source={{ uri: message.mediaUrl }} 
            style={{ 
              width: maxWidth,
              height: maxHeight,
              maxWidth: '100%',
              aspectRatio: 1
            }}
            className="rounded-xl"
            resizeMode="contain"
          />
        </TouchableOpacity>
      );
    } else {
      return (
        <View className={`${isOwn ? 'self-end' : 'self-start'} rounded-xl overflow-hidden mb-1 bg-black`}
             style={{ maxWidth: maxWidth, maxHeight: maxHeight, aspectRatio: 1 }}>
          {isPlaying ? (
            <View className="rounded-xl bg-black relative" style={{ width: '100%', height: '100%' }}>
              {isVideoLoading && (
                <View className="absolute inset-0 z-10 flex-1 justify-center items-center bg-black/70">
                  <ActivityIndicator size="large" color="#ffffff" />
                </View>
              )}
              <Video
                ref={videoRef}
                source={{ uri: message.mediaUrl }}
                rate={1.0}
                volume={1.0}
                isMuted={false}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                useNativeControls
                className="rounded-xl bg-black z-0"
                style={{ width: '100%', height: '100%' }}
                onReadyForDisplay={() => {
                  setIsVideoLoading(false);
                }}
                onLoad={(status) => {
                  setIsVideoPreloaded(true);
                  if (status.isLoaded && status.durationMillis) {
                    setVideoDuration(status.durationMillis);
                  }
                }}
                onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                  if (status.isLoaded) {
                    if (status.didJustFinish) {
                      setIsPlaying(false);
                    }
                  }
                }}
                onError={(error) => {
                  console.error('[Video Error]:', error);
                  setIsPlaying(false);
                  setIsVideoLoading(false);
                }}
              />
            </View>
          ) : (
            <TouchableOpacity 
              onPress={handleVideoPlay}
              className="rounded-xl bg-gray-800 overflow-hidden relative"
              style={{ width: '100%', height: '100%' }}
            >
              {isLoadingThumbnail ? (
                <View className="flex-1 justify-center items-center bg-gray-800">
                  <ActivityIndicator size="small" color="#ffffff" />
                </View>
              ) : thumbnailError || (!thumbnailUri && !isLoadingThumbnail) ? (
                <View className="flex-1 justify-center items-center bg-gray-800">
                  <FontAwesome5 name="video" size={24} color="white" />
                </View>
              ) : (
                <Image 
                  source={{ uri: thumbnailUri || message.mediaUrl || '' }} 
                  className="rounded-xl"
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                  onError={(error) => {
                    console.error('[Thumbnail Error]:', error);
                    setThumbnailError(true);
                  }}
                />
              )}
              
              {/* Overlay for video indicator */}
              <View className="absolute inset-0 bg-black/20">
                {/* Play button */}
                <View className="absolute inset-0 justify-center items-center">
                  <View className="w-8 h-8 rounded-full bg-black/50 justify-center items-center">
                    <FontAwesome5 name="play" size={12} color="white" />
                  </View>
                </View>
                
                {/* Duration badge */}
                {videoDuration !== null && (
                  <View className="absolute bottom-2 right-2 bg-black/60 rounded px-1.5 py-0.5">
                    <Text className="text-white text-xs font-medium">
                      {formatDuration(videoDuration)}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>
      );
    }
  };

  const renderMessageStatus = () => {
    if (!isOwn) return null;
    
    let statusColor = '#8e8e8e';
    let statusText = '';
    let iconName: keyof typeof Ionicons.glyphMap = 'time-outline';
    let showRetryButton = false;
    
    if (message.isFailed) {
      statusColor = '#ff3b30';
      statusText = 'Gửi thất bại';
      iconName = 'alert-circle-outline';
      showRetryButton = true;
    } else if (!message.isSent) {
      statusColor = '#ff9500';
      statusText = 'Đang gửi...';
      iconName = 'time-outline';
    } else if (message.isSent && !message.isDelivered) {
      statusColor = '#8e8e8e';
      statusText = 'Đã gửi';
      iconName = 'checkmark';
    } else if (message.isDelivered && !message.isRead) {
      statusColor = '#8e8e8e';
      statusText = 'Đã nhận';
      iconName = 'checkmark-done';
    } else if (message.isRead) {
      statusColor = '#0095f6';
      statusText = 'Đã xem';
      iconName = 'checkmark-done';
    }
    
    return (
      <View className="flex-row items-center justify-end mt-1 mr-1">
        <Text className="text-gray-400 text-xs mr-2">
          {new Date(message.timestamp).toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
        <View className="flex-row items-center">
          <Text className="text-xs mr-1" style={{ color: statusColor }}>
            {statusText}
          </Text>
          <Ionicons name={iconName} size={14} color={statusColor} />
          {showRetryButton && onRetryMessage && (
            <TouchableOpacity 
              onPress={() => onRetryMessage(message.queuedMessageId || message.id)}
              className="ml-2 bg-red-500 px-2 py-1 rounded-lg"
            >
              <Text className="text-white text-xs font-medium">Thử lại</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View className={`flex-row mb-3 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && showAvatar && (
        <View className="mr-2 mt-auto">
          <Image 
            source={avatarSource} 
            className="w-9 h-9 rounded-full" 
          />
        </View>
      )}
      
      <View className={`max-w-[80%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {isGroup && !isOwn && message.senderName && (
          <Text className="text-gray-400 text-xs mb-1 ml-2">{message.senderName}</Text>
        )}
        
        <TouchableOpacity 
          onLongPress={onLongPress}
          className={`${ 
            message.type === 'text' && !message.mediaUrl
              ? `rounded-2xl px-3 py-2 ${isOwn ? 'bg-blue-500' : 'bg-gray-800'}` 
              : ''
          }`}
        >
          {message.mediaUrl ? renderMedia() : null}
          
          {message.content && (!message.mediaUrl || message.type === 'text') && (
            <Text className={`text-white text-base`} style={{ flexWrap: 'wrap' }}>{message.content}</Text>
          )}
        </TouchableOpacity>
        
        {renderMessageStatus()}
      </View>
    </View>
  );
};

export default MessageBubble;
