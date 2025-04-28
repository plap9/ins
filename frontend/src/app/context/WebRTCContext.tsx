import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import webRTCService from '../../services/webRTCService';
import socketService from '../../services/socketService';
import messageService from '../../services/messageService';
import { useAuth } from './AuthContext';

interface CallParticipant {
  userId: number;
  username?: string;
  profilePicture?: string;
  remoteStream?: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

interface CallInfo {
  callId: number;
  conversationId: number;
  initiatorId: number;
  initiatorName?: string;
  initiatorAvatar?: string;
  callType: 'audio' | 'video';
  participants: Map<number, CallParticipant>;
  status: 'ringing' | 'ongoing' | 'ended';
  startTime?: Date;
  isGroup: boolean;
}

interface WebRTCContextType {
  localStream: MediaStream | null;
  incomingCall: CallInfo | null;
  currentCall: CallInfo | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isCallLoading: boolean;
  
  startCall: (targetId: number, callType: 'audio' | 'video', isConversation?: boolean) => Promise<boolean>;
  acceptCall: () => Promise<boolean>;
  rejectCall: () => void;
  endCall: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  getParticipantStream: (userId: number) => MediaStream | null;
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallInfo | null>(null);
  const [currentCall, setCurrentCall] = useState<CallInfo | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(false);
  const [isCallLoading, setIsCallLoading] = useState<boolean>(false);
  
  const callCleanupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { authData } = useAuth();
  const user = authData?.user;

  const cleanupCall = useCallback(() => {
    webRTCService.endCall();
    
    setLocalStream(null);
    setCurrentCall(null);
    setIncomingCall(null);
    setIsAudioEnabled(true);
    setIsVideoEnabled(false);
    
    if (callCleanupTimerRef.current) {
      clearTimeout(callCleanupTimerRef.current);
      callCleanupTimerRef.current = null;
    }
  }, []);
  
  const endCall = useCallback(() => {
    if (currentCall) {
      webRTCService.endCall();
      cleanupCall();
    }
  }, [currentCall, cleanupCall]);

  useEffect(() => {
    if (!user) return;

    const unsubscribeIncomingCall = socketService.onCall('incoming', async (data: any) => {
      if (currentCall) {
        messageService.answerCall(data.call_id, 'rejected');
        return;
      }
      
      try {
        const callDetails = await messageService.getCallDetails(data.call_id);
        
        const newIncomingCall: CallInfo = {
          callId: data.call_id,
          conversationId: callDetails.conversation_id,
          initiatorId: callDetails.initiator_id,
          initiatorName: (data.caller_name || callDetails.initiator_name || '') as string,
          initiatorAvatar: (data.caller_avatar || callDetails.initiator_avatar || '') as string,
          callType: callDetails.call_type,
          participants: new Map(),
          status: 'ringing',
          isGroup: callDetails.is_group || false
        };
        
        newIncomingCall.participants.set(callDetails.initiator_id, {
          userId: callDetails.initiator_id,
          username: (data.caller_name || callDetails.initiator_name || '') as string,
          profilePicture: (data.caller_avatar || callDetails.initiator_avatar || '') as string,
          audioEnabled: true,
          videoEnabled: callDetails.call_type === 'video'
        });
        
        if (callDetails.participants && callDetails.participants.length > 0) {
          callDetails.participants.forEach((participant: any) => {
            if (participant.user_id !== callDetails.initiator_id && participant.user_id !== user.user_id) {
              newIncomingCall.participants.set(participant.user_id, {
                userId: participant.user_id,
                username: participant.username,
                profilePicture: participant.profile_picture,
                audioEnabled: true,
                videoEnabled: callDetails.call_type === 'video'
              });
            }
          });
        }
        
        setIncomingCall(newIncomingCall);
        
        if (callCleanupTimerRef.current) {
          clearTimeout(callCleanupTimerRef.current);
        }
        
        callCleanupTimerRef.current = setTimeout(() => {
          if (incomingCall && incomingCall.status === 'ringing') {
            messageService.answerCall(data.call_id, 'missed');
            setIncomingCall(null);
          }
        }, 30000);
      } catch (error) {
        console.error('Lỗi khi xử lý cuộc gọi đến:', error);
      }
    });
    
    const unsubscribeUserJoined = socketService.onCall('user-joined', async (data: any) => {
      if (!currentCall) return;
      
      try {
        let username = data.username;
        let profilePicture = data.profile_picture;
        
        if (!username || !profilePicture) {
          try {
            const userDetails = await messageService.getUserDetails(data.user_id);
            username = userDetails.username || '';
            profilePicture = userDetails.profile_picture || '';
          } catch (error) {
            console.error('Không thể lấy thông tin người dùng:', error);
          }
        }
        
        setCurrentCall(prev => {
          if (!prev) return null;
          
          const updatedParticipants = new Map(prev.participants);
          updatedParticipants.set(data.user_id, {
            userId: data.user_id,
            username,
            profilePicture,
            audioEnabled: true,
            videoEnabled: prev.callType === 'video'
          });
          
          return {
            ...prev,
            status: 'ongoing',
            participants: updatedParticipants
          };
        });
      } catch (error) {
        console.error('Lỗi khi xử lý sự kiện user-joined:', error);
      }
    });
    
    const unsubscribeUserLeft = socketService.onCall('user-left', (data: any) => {
      if (!currentCall) return;
      
      setCurrentCall(prev => {
        if (!prev) return null;
        
        const updatedParticipants = new Map(prev.participants);
        updatedParticipants.delete(data.user_id);
        
        if (updatedParticipants.size === 0 || 
            (updatedParticipants.size === 1 && updatedParticipants.has(user.user_id))) {
          cleanupCall();
          return null;
        }
        
        return {
          ...prev,
          participants: updatedParticipants
        };
      });
    });
    
    const unsubscribeCallRejected = socketService.onCall('rejected', (data: any) => {
      if (incomingCall && incomingCall.callId === data.call_id) {
        setIncomingCall(null);
      }
      
      if (currentCall && currentCall.callId === data.call_id) {
        cleanupCall();
      }
    });
    
    const unsubscribeCallEnded = socketService.onCall('ended', (data: any) => {
      if (incomingCall && incomingCall.callId === data.call_id) {
        setIncomingCall(null);
      }
      
      if (currentCall && currentCall.callId === data.call_id) {
        cleanupCall();
      }
    });
    
    const unsubscribeMediaState = socketService.onCall('media-state', (data: any) => {
      if (!currentCall || !currentCall.participants.has(data.user_id)) return;
      
      setCurrentCall(prev => {
        if (!prev) return null;
        
        const updatedParticipants = new Map(prev.participants);
        const participant = updatedParticipants.get(data.user_id);
        
        if (participant) {
          updatedParticipants.set(data.user_id, {
            ...participant,
            audioEnabled: data.audio,
            videoEnabled: data.video
          });
        }
        
        return {
          ...prev,
          participants: updatedParticipants
        };
      });
    });
    
    return () => {
      unsubscribeIncomingCall();
      unsubscribeUserJoined();
      unsubscribeUserLeft();
      unsubscribeCallRejected();
      unsubscribeCallEnded();
      unsubscribeMediaState();
      
      if (callCleanupTimerRef.current) {
        clearTimeout(callCleanupTimerRef.current);
      }
    };
  }, [user, incomingCall, currentCall, cleanupCall]);
  
  useEffect(() => {
    if (!currentCall || !user) return;
    
    const unsubscribeStreamHandlers: (() => void)[] = [];
    
    const checkParticipantStreams = () => {
      currentCall.participants.forEach((participant, userId) => {
        if (userId !== user.user_id) {
          const remoteStream = webRTCService.getRemoteStream(userId);
          
          if (remoteStream && !participant.remoteStream) {
            setCurrentCall(prev => {
              if (!prev) return null;
              
              const updatedParticipants = new Map(prev.participants);
              const updatedParticipant = updatedParticipants.get(userId);
              
              if (updatedParticipant) {
                updatedParticipants.set(userId, {
                  ...updatedParticipant,
                  remoteStream
                });
              }
              
              return {
                ...prev,
                participants: updatedParticipants
              };
            });
          }
        }
      });
    };
    
    checkParticipantStreams();
    
    const intervalId = setInterval(checkParticipantStreams, 1000);
    
    return () => {
      clearInterval(intervalId);
      unsubscribeStreamHandlers.forEach(unsub => unsub());
    };
  }, [currentCall, user]);
  
  const rejectCall = useCallback(() => {
    if (incomingCall) {
      messageService.answerCall(incomingCall.callId, 'rejected');
      setIncomingCall(null);
    }
  }, [incomingCall]);
  
  const startCall = useCallback(async (targetId: number, callType: 'audio' | 'video' = 'audio', isConversation: boolean = false): Promise<boolean> => {
    try {
      setIsCallLoading(true);
      
      if (currentCall) {
        endCall();
      }
      
      setIsVideoEnabled(callType === 'video');
      
      const callData = isConversation 
        ? { call_type: callType, conversation_id: targetId }
        : { call_type: callType, recipient_id: targetId };
      
      const response = await messageService.initiateCall(callData);
      
      if (!response || !response.call_id) {
        throw new Error("Không thể khởi tạo cuộc gọi");
      }
      
      const success = await webRTCService.initiateCall(
        isConversation ? response.conversation_id : targetId,
        callType,
        isConversation
      );
      
      if (success) {
        const localMediaStream = webRTCService.getLocalStream();
        setLocalStream(localMediaStream);
        
        const participants = new Map<number, CallParticipant>();
        
        if (user) {
          participants.set(user.user_id, {
            userId: user.user_id,
            username: user.username || '',
            profilePicture: user.profile_picture || '',
            audioEnabled: true,
            videoEnabled: callType === 'video'
          });
        }
        
        setCurrentCall({
          callId: response.call_id,
          conversationId: response.conversation_id,
          initiatorId: user?.user_id || 0,
          callType,
          participants,
          status: 'ringing',
          startTime: new Date(),
          isGroup: response.is_group || false
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Lỗi khi bắt đầu cuộc gọi:', error);
      return false;
    } finally {
      setIsCallLoading(false);
    }
  }, [currentCall, user, endCall]);
  
  const acceptCall = useCallback(async (): Promise<boolean> => {
    if (!incomingCall) return false;
    
    try {
      setIsCallLoading(true);
      
      console.log(`[WebRTC] Bắt đầu chấp nhận cuộc gọi ${incomingCall.callId}`);
      
      const { callId, callType } = incomingCall;
      setIsVideoEnabled(callType === 'video');
      
      await messageService.answerCall(callId, 'accepted');
      
      const success = await webRTCService.acceptCall(callId, callType);
      
      if (success) {
        const localMediaStream = webRTCService.getLocalStream();
        setLocalStream(localMediaStream);
        
        const updatedParticipants = new Map(incomingCall.participants);
        
        if (user) {
          updatedParticipants.set(user.user_id, {
            userId: user.user_id,
            username: user.username || '',
            profilePicture: user.profile_picture || '',
            audioEnabled: true,
            videoEnabled: callType === 'video'
          });
        }
        
        setCurrentCall({
          ...incomingCall,
          status: 'ongoing',
          participants: updatedParticipants,
          startTime: new Date()
        });
        
        setIncomingCall(null);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Lỗi khi chấp nhận cuộc gọi:', error);
      return false;
    } finally {
      setIsCallLoading(false);
    }
  }, [incomingCall, user]);
  
  const toggleAudio = useCallback(() => {
    if (!localStream) return;
    
    const newState = !isAudioEnabled;
    webRTCService.toggleAudio(newState);
    setIsAudioEnabled(newState);
    
    if (currentCall && currentCall.callId) {
      socketService.toggleMute(currentCall.callId, !newState);
    }
  }, [localStream, isAudioEnabled, currentCall]);
  
  const toggleVideo = useCallback(() => {
    if (!localStream) return;
    
    const newState = !isVideoEnabled;
    webRTCService.toggleVideo(newState);
    setIsVideoEnabled(newState);
    
    if (currentCall && currentCall.callId) {
      socketService.toggleCamera(currentCall.callId, newState);
    }
  }, [localStream, isVideoEnabled, currentCall]);
  
  const getParticipantStream = useCallback((userId: number): MediaStream | null => {
    if (!currentCall || !currentCall.participants.has(userId)) return null;
    
    const participant = currentCall.participants.get(userId);
    return participant?.remoteStream || null;
  }, [currentCall]);
  
  const value = {
    localStream,
    incomingCall,
    currentCall,
    isAudioEnabled,
    isVideoEnabled,
    isCallLoading,
    
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
    getParticipantStream
  };
  
  return (
    <WebRTCContext.Provider value={value}>
      {children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTC = (): WebRTCContextType => {
  const context = useContext(WebRTCContext);
  if (context === undefined) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
};

export default WebRTCContext; 