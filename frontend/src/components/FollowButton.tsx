import React, { useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { followUser, unfollowUser } from '~/services/followService';

interface FollowButtonProps {
  userId: number;
  username: string;
  initialFollowState: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  size?: 'small' | 'medium' | 'large';
  style?: 'primary' | 'secondary';
}

const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  username,
  initialFollowState,
  onFollowChange,
  size = 'medium',
  style = 'primary'
}) => {
  const [isFollowing, setIsFollowing] = useState(initialFollowState);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollowToggle = async () => {
    if (isLoading) return;

    setIsLoading(true);
    const previousState = isFollowing;

    try {
      if (isFollowing) {
        await unfollowUser(userId);
        setIsFollowing(false);
        onFollowChange?.(false);
      } else {
        await followUser(userId);
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (error: any) {
      // Rollback state on error
      setIsFollowing(previousState);
      
      const errorMessage = error.response?.data?.message || 
        (isFollowing ? 'Không thể unfollow người dùng' : 'Không thể follow người dùng');
      
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'px-3 py-1';
      case 'large':
        return 'px-6 py-3';
      default:
        return 'px-4 py-2';
    }
  };

  const getTextSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'text-sm';
      case 'large':
        return 'text-lg';
      default:
        return 'text-base';
    }
  };

  const getStyleClasses = () => {
    if (isFollowing) {
      return style === 'primary' 
        ? 'bg-gray-200 border border-gray-300' 
        : 'bg-transparent border border-gray-400';
    } else {
      return style === 'primary'
        ? 'bg-blue-500 border border-blue-500'
        : 'bg-transparent border border-blue-500';
    }
  };

  const getTextColorClasses = () => {
    if (isFollowing) {
      return 'text-gray-700';
    } else {
      return style === 'primary' ? 'text-white' : 'text-blue-500';
    }
  };

  const getButtonText = () => {
    if (isLoading) return '';
    return isFollowing ? 'Đang theo dõi' : 'Theo dõi';
  };

  return (
    <TouchableOpacity
      onPress={handleFollowToggle}
      disabled={isLoading}
      className={`
        rounded-lg items-center justify-center flex-row
        ${getSizeClasses()}
        ${getStyleClasses()}
        ${isLoading ? 'opacity-70' : ''}
      `}
    >
      {isLoading ? (
        <ActivityIndicator 
          size="small" 
          color={isFollowing ? '#374151' : (style === 'primary' ? '#ffffff' : '#3B82F6')} 
        />
      ) : (
        <Text className={`font-medium ${getTextSizeClasses()} ${getTextColorClasses()}`}>
          {getButtonText()}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default FollowButton; 