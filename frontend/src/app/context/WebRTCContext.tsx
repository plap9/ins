import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import webRTCService from '../../services/webRTCService';
import socketService from '../../services/socketService';
import { useAuth } from './AuthContext';

interface CallInfo {
  roomId: string;
  rtcSessionId: string;
  callerId: number;
  callerName?: string;
  callerAvatar?: string;
  callType: 'audio' | 'video';
  participants: Map<number, {
    userId: number;
    username?: string;
    profilePicture?: string;
    remoteStream?: MediaStream;
    audioEnabled: boolean;
    videoEnabled: boolean;
  }>;
  status: 'ringing' | 'ongoing' | 'ended';
  startTime?: Date;
}

interface WebRTCContextType {
  localStream: MediaStream | null;
  incomingCall: CallInfo | null;
  currentCall: CallInfo | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isCallLoading: boolean;
  
  startCall: (roomId: string, callType: 'audio' | 'video') => Promise<boolean>;
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

    const unsubscribeIncomingCall = socketService.onCall('incoming', (data: any) => {
      if (currentCall) {
        socketService.rejectCall(data.roomId, data.rtcSessionId);
        return;
      }
      
      const newIncomingCall: CallInfo = {
        roomId: data.roomId,
        rtcSessionId: data.rtcSessionId,
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        callType: data.callType,
        participants: new Map(),
        status: 'ringing'
      };
      
      setIncomingCall(newIncomingCall);
      
      if (callCleanupTimerRef.current) {
        clearTimeout(callCleanupTimerRef.current);
      }
      
      callCleanupTimerRef.current = setTimeout(() => {
        if (incomingCall && incomingCall.status === 'ringing') {
          rejectCall();
        }
      }, 30000);
    });
    
    const unsubscribeUserJoined = socketService.onCall('user-joined', (data: any) => {
      if (!currentCall) return;
      
      setCurrentCall(prev => {
        if (!prev) return null;
        
        const updatedParticipants = new Map(prev.participants);
        updatedParticipants.set(data.userId, {
          userId: data.userId,
          username: data.username,
          profilePicture: data.profilePicture,
          audioEnabled: true,
          videoEnabled: prev.callType === 'video'
        });
        
        return {
          ...prev,
          status: 'ongoing',
          participants: updatedParticipants
        };
      });
    });
    
    const unsubscribeUserLeft = socketService.onCall('user-left', (data: any) => {
      if (!currentCall) return;
      
      setCurrentCall(prev => {
        if (!prev) return null;
        
        const updatedParticipants = new Map(prev.participants);
        updatedParticipants.delete(data.userId);
        
        if (updatedParticipants.size === 0) {
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
      if (incomingCall && incomingCall.rtcSessionId === data.rtcSessionId) {
        setIncomingCall(null);
      }
      
      if (currentCall && currentCall.rtcSessionId === data.rtcSessionId) {
        cleanupCall();
      }
    });
    
    const unsubscribeCallEnded = socketService.onCall('ended', (data: any) => {
      if (incomingCall && incomingCall.rtcSessionId === data.rtcSessionId) {
        setIncomingCall(null);
      }
      
      if (currentCall && currentCall.rtcSessionId === data.rtcSessionId) {
        cleanupCall();
      }
    });
    
    const unsubscribeMediaState = socketService.onCall('media-state', (data: any) => {
      if (!currentCall || !currentCall.participants.has(data.userId)) return;
      
      setCurrentCall(prev => {
        if (!prev) return null;
        
        const updatedParticipants = new Map(prev.participants);
        const participant = updatedParticipants.get(data.userId);
        
        if (participant) {
          updatedParticipants.set(data.userId, {
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
    
    currentCall.participants.forEach((participant, userId) => {
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
    });
    
    return () => {
      unsubscribeStreamHandlers.forEach(unsub => unsub());
    };
  }, [currentCall, user]);
  
  const rejectCall = useCallback(() => {
    if (incomingCall) {
      webRTCService.rejectCall(incomingCall.roomId, incomingCall.rtcSessionId);
      setIncomingCall(null);
    }
  }, [incomingCall]);
  
  const startCall = useCallback(async (roomId: string, callType: 'audio' | 'video' = 'audio'): Promise<boolean> => {
    try {
      setIsCallLoading(true);
      
      if (currentCall) {
        endCall();
      }
      
      setIsVideoEnabled(callType === 'video');
      const success = await webRTCService.startCall(roomId, callType);
      
      if (success) {
        const localMediaStream = webRTCService.getLocalStream();
        setLocalStream(localMediaStream);
        
        setCurrentCall({
          roomId,
          rtcSessionId: '', 
          callerId: user?.user_id || 0,
          callType,
          participants: new Map(),
          status: 'ringing',
          startTime: new Date()
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
      
      const { roomId, rtcSessionId, callType } = incomingCall;
      setIsVideoEnabled(callType === 'video');
      
      const success = await webRTCService.acceptCall(roomId, rtcSessionId, callType);
      
      if (success) {
        const localMediaStream = webRTCService.getLocalStream();
        setLocalStream(localMediaStream);
        
        const updatedParticipants = new Map(incomingCall.participants);
        updatedParticipants.set(incomingCall.callerId, {
          userId: incomingCall.callerId,
          username: incomingCall.callerName,
          profilePicture: incomingCall.callerAvatar,
          audioEnabled: true,
          videoEnabled: callType === 'video'
        });
        
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
  }, [incomingCall]);
  
  const toggleAudio = useCallback(() => {
    if (!localStream) return;
    
    const newState = !isAudioEnabled;
    webRTCService.toggleAudio(newState);
    setIsAudioEnabled(newState);
    
    if (currentCall && currentCall.roomId) {
      socketService.updateMediaState(currentCall.roomId, isVideoEnabled, newState);
    }
  }, [localStream, isAudioEnabled, isVideoEnabled, currentCall]);
  
  const toggleVideo = useCallback(() => {
    if (!localStream) return;
    
    const newState = !isVideoEnabled;
    webRTCService.toggleVideo(newState);
    setIsVideoEnabled(newState);
    
    if (currentCall && currentCall.roomId) {
      socketService.updateMediaState(currentCall.roomId, newState, isAudioEnabled);
    }
  }, [localStream, isVideoEnabled, isAudioEnabled, currentCall]);
  
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