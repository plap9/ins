import apiClient from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  public async getCredentials(forceRefresh = false): Promise<TurnCredentials | null> {
    if (!forceRefresh && this.credentials && Date.now() < this.credentials.expiresAt) {
      return this.credentials;
    }

    try {
      const response = await apiClient.get<TurnApiResponse>('/api/webrtc/turn-credentials');
      
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
      
      await this.saveCredentialsToCache(this.credentials);
      
      console.log('Đã lấy TURN credentials mới từ server');
      return this.credentials;
    } catch (error) {
      console.error('Lỗi khi lấy TURN credentials:', error);
      return null;
    }
  }

  public async getIceServers(): Promise<RTCIceServer[]> {
    const defaultServers: RTCIceServer[] = [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
    ];
    
    const turnCredentials = await this.getCredentials();
    
    if (turnCredentials) {
      return [
        ...defaultServers,
        {
          urls: turnCredentials.urls,
          username: turnCredentials.username,
          credential: turnCredentials.credential
        }
      ];
    }
    
    return defaultServers;
  }

  public async testTurnConnection(): Promise<{success: boolean, message: string}> {
    try {
      const turnCredentials = await this.getCredentials(true);
      
      if (!turnCredentials) {
        return {
          success: false,
          message: 'Không thể lấy thông tin TURN credentials'
        };
      }
      
      console.log('TURN Server URLs:', turnCredentials.urls);
      console.log('TURN Username:', turnCredentials.username);
      console.log('TURN Credential:', turnCredentials.credential);
      console.log('Hết hạn sau:', Math.floor((turnCredentials.expiresAt - Date.now())/1000), 'giây');
      
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