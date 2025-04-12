import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import IncomingCall from '../../../components/message/IncomingCall';

export default function IncomingCallScreen() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams<{ id: string; type: 'audio' | 'video' }>();
  const callType = type || 'audio';
  
  // Giả lập dữ liệu người gọi
  const [caller, setCaller] = useState({
    id: '1',
    username: 'Timmy Doan',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
  });

  const handleAccept = () => {
    if (callType === 'audio') {
      router.push(`/message/calls/audio?id=${id}`);
    } else {
      router.push(`/message/calls/video?id=${id}`);
    }
  };

  const handleReject = () => {
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      
      <IncomingCall
        caller={caller}
        callType={callType}
        onAccept={handleAccept}
        onReject={handleReject}
      />
    </SafeAreaView>
  );
}
