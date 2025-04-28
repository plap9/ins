import apiClient from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../app/context/AuthContext';

interface TurnCredentials {
  urls: string[];
  username: string;
  credential: string;
  expiresAt: number;
}

interface TurnApiResponse {
  success: boolean;
  urls: string | string[];
  username: string;
  credential: string;
  ttl: number;
}

class TurnService {
  private static instance: TurnService;
  private credentials: TurnCredentials | null = null;
  private credentialsFetchTime: number = 0;
  private readonly CREDENTIALS_TTL = 3600 * 1000;
  private readonly TURN_CACHE_KEY = '@TurnCredentials';
  private fetchFailed: boolean = false;
  private fetchRetryCount: number = 0;
  private readonly MAX_RETRY_COUNT = 3;

  private constructor() {
    this.loadCachedCredentials();
  }

  public static getInstance(): TurnService {
    if (!TurnService.instance) {
      TurnService.instance = new TurnService();
    }
    return TurnService.instance;
  }

  private async loadCachedCredentials(): Promise<void> {
    try {
      const cachedData = await AsyncStorage.getItem(this.TURN_CACHE_KEY);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        if (parsedData.expiresAt > Date.now()) {
          this.credentials = parsedData;
          this.credentialsFetchTime = Date.now() - (this.CREDENTIALS_TTL - (parsedData.expiresAt - Date.now()));
          console.log('Đã tải TURN credentials từ cache');
        } else {
          console.log('TURN credentials trong cache đã hết hạn');
          await AsyncStorage.removeItem(this.TURN_CACHE_KEY);
        }
      }
    } catch (error) {
      console.error('Lỗi khi tải TURN credentials từ cache:', error);
    }
  }

  private async saveCredentialsToCache(credentials: TurnCredentials): Promise<void> {
    try {
      await AsyncStorage.setItem(this.TURN_CACHE_KEY, JSON.stringify(credentials));
    } catch (error) {
      console.error('Lỗi khi lưu TURN credentials vào cache:', error);
    }
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const authDataJSON = await AsyncStorage.getItem('@AuthData');
      if (authDataJSON) {
        const authData = JSON.parse(authDataJSON);
        return authData.token || null;
      }
      return null;
    } catch (error) {
      console.error('Lỗi khi lấy token xác thực:', error);
      return null;
    }
  }

  public async getCredentials(forceRefresh = false): Promise<TurnCredentials | null> {
    if (this.fetchFailed && this.fetchRetryCount >= this.MAX_RETRY_COUNT && !forceRefresh) {
      console.log(`Đã thử lấy TURN credentials ${this.fetchRetryCount} lần không thành công, sử dụng STUN`);
      return null;
    }

    if (!forceRefresh && this.credentials && Date.now() < this.credentials.expiresAt) {
      return this.credentials;
    }

    try {
      console.log('Đang yêu cầu TURN credentials từ server...');
      
      const token = await this.getAuthToken();
      
      if (!token) {
        console.warn('Không có token xác thực để lấy TURN credentials');
        throw new Error('Không có token xác thực');
      }
      
      const response = await apiClient.get<TurnApiResponse>('/webrtc/turn-credentials', {
        timeout: 10000,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.data) {
        throw new Error('Không nhận được dữ liệu TURN credentials từ server');
      }
      
      const { urls, username, credential, ttl } = response.data;
      
      const expiresAt = Date.now() + (ttl || this.CREDENTIALS_TTL);
      
      this.credentials = {
        urls: Array.isArray(urls) ? urls : [urls],
        username,
        credential,
        expiresAt
      };
      
      this.credentialsFetchTime = Date.now();
      this.fetchFailed = false;
      this.fetchRetryCount = 0;
      
      await this.saveCredentialsToCache(this.credentials);
      
      console.log('Đã lấy TURN credentials mới từ server');
      console.log('TURN Server URLs:', this.credentials.urls);
      console.log('TURN Username:', username);
      console.log('TURN Credential:', '********'); 
      console.log('Hết hạn sau:', Math.floor((expiresAt - Date.now())/1000), 'giây');
      
      return this.credentials;
    } catch (error) {
      console.error('Lỗi khi lấy TURN credentials:', error);
      this.fetchFailed = true;
      this.fetchRetryCount++;
      
      if (this.fetchRetryCount < this.MAX_RETRY_COUNT) {
        return await this.getBackupCredentials();
      }
      
      return null;
    }
  }

  private async getBackupCredentials(): Promise<TurnCredentials | null> {
    console.log('Sử dụng phương thức dự phòng cho TURN credentials');
    
    try {
      const cachedData = await AsyncStorage.getItem(this.TURN_CACHE_KEY);
      
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        this.credentials = parsedData;
        console.log('Sử dụng TURN credentials cũ từ cache trong trường hợp khẩn cấp');
        return this.credentials;
      }
      
      console.log('Không có TURN credentials trong cache, sử dụng chỉ STUN servers');
      return null;
    } catch (error) {
      console.error('Lỗi khi lấy backup TURN credentials:', error);
      return null;
    }
  }

  public async getIceServers(): Promise<RTCIceServer[]> {
    try {
      const publicStunServers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' }
      ];
      
      const turnCredentials = await this.getCredentials();
      
      if (turnCredentials) {
        const turnServer: RTCIceServer = {
          urls: turnCredentials.urls,
          username: turnCredentials.username,
          credential: turnCredentials.credential
        };
        
        console.log('Sử dụng TURN server cấu hình:', {
          urls: turnServer.urls,
          username: turnServer.username,
        });
        
        return [
          ...publicStunServers,
          turnServer
        ];
      }
      
      console.log('Sử dụng chỉ máy chủ STUN công cộng');
      return publicStunServers;
    } catch (error) {
      console.error('Lỗi khi lấy ICE servers, sử dụng STUN mặc định:', error);
      return [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ];
    }
  }

  public async testTurnConnection(): Promise<{success: boolean, message: string}> {
    try {
      const turnCredentials = await this.getCredentials(true);
      
      if (!turnCredentials) {
        return {
          success: false,
          message: 'Không thể lấy thông tin TURN credentials. Sẽ sử dụng chỉ STUN.'
        };
      }
      
      console.log('TURN Server URLs:', turnCredentials.urls);
      console.log('TURN Username:', turnCredentials.username);
      console.log('TURN Credential hết hạn sau:', Math.floor((turnCredentials.expiresAt - Date.now())/1000), 'giây');
      
      return {
        success: true,
        message: 'Đã lấy thông tin TURN credentials thành công. Xem log để biết chi tiết.'
      };
    } catch (error) {
      return {
        success: false,
        message: `Lỗi khi test kết nối TURN: ${error}`
      };
    }
  }
}

export default TurnService.getInstance(); 