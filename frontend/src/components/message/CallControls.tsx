import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';

interface CallControlsProps {
  isAudioCall: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isSpeakerOn: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleSpeaker: () => void;
  onFlipCamera: () => void;
  onEndCall: () => void;
  onMinimize?: () => void;
}

const CallControls: React.FC<CallControlsProps> = ({
  isAudioCall,
  isAudioEnabled,
  isVideoEnabled,
  isSpeakerOn,
  onToggleAudio,
  onToggleVideo,
  onToggleSpeaker,
  onFlipCamera,
  onEndCall,
  onMinimize,
}) => {
  return (
    <View className="w-full">
      {/* Hàng nút điều khiển chính */}
      <View className="flex-row justify-around items-center mb-6">
        <TouchableOpacity 
          onPress={onToggleAudio}
          className={`w-14 h-14 rounded-full justify-center items-center ${isAudioEnabled ? 'bg-[#303030]' : 'bg-red-500'}`}
        >
          <Ionicons 
            name={isAudioEnabled ? "mic" : "mic-off"} 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>
        
        {!isAudioCall && (
          <TouchableOpacity 
            onPress={onToggleVideo}
            className={`w-14 h-14 rounded-full justify-center items-center ${isVideoEnabled ? 'bg-[#303030]' : 'bg-red-500'}`}
          >
            <Ionicons 
              name={isVideoEnabled ? "videocam" : "videocam-off"} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          onPress={onToggleSpeaker}
          className={`w-14 h-14 rounded-full justify-center items-center ${isSpeakerOn ? 'bg-[#0095f6]' : 'bg-[#303030]'}`}
        >
          <Ionicons 
            name={isSpeakerOn ? "volume-high" : "volume-medium"} 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>
        
        {!isAudioCall && (
          <TouchableOpacity 
            onPress={onFlipCamera}
            className="w-14 h-14 rounded-full bg-[#303030] justify-center items-center"
          >
            <Ionicons name="camera-reverse" size={24} color="white" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          onPress={onEndCall}
          className="w-14 h-14 rounded-full bg-red-600 justify-center items-center"
        >
          <MaterialIcons name="call-end" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      {/* Nút thu nhỏ (nếu có) */}
      {onMinimize && (
        <TouchableOpacity 
          onPress={onMinimize}
          className="self-center mb-4"
        >
          <Feather name="chevron-down" size={24} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default CallControls;
