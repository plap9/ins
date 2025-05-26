import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  type: 'text' | 'image' | 'video';
  mediaUri?: string;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
}

class NetworkService {
  private isOnline: boolean = true;
  private messageQueue: QueuedMessage[] = [];
  private listeners: Set<(isOnline: boolean) => void> = new Set();
  private retryTimer: NodeJS.Timeout | null = null;
  private readonly STORAGE_KEY = 'offline_message_queue';
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]; // exponential backoff

  constructor() {
    this.initNetworkListener();
    this.loadQueueFromStorage();
  }

  private async initNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      console.log(`[NetworkService] Network status: ${this.isOnline ? 'Online' : 'Offline'}`);
      
      this.listeners.forEach(listener => listener(this.isOnline));
      
      if (!wasOnline && this.isOnline) {
        this.processQueue();
      }
    });

    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
  }

  private async loadQueueFromStorage() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.messageQueue = JSON.parse(stored);
        console.log(`[NetworkService] Loaded ${this.messageQueue.length} queued messages from storage`);
      }
    } catch (error) {
      console.error('[NetworkService] Error loading queue from storage:', error);
    }
  }

  private async saveQueueToStorage() {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.messageQueue));
    } catch (error) {
      console.error('[NetworkService] Error saving queue to storage:', error);
    }
  }

  public async queueMessage(
    conversationId: string,
    content: string,
    type: 'text' | 'image' | 'video' = 'text',
    mediaUri?: string
  ): Promise<string> {
    const messageId = Date.now().toString();
    
    const queuedMessage: QueuedMessage = {
      id: messageId,
      conversationId,
      content,
      type,
      mediaUri,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: this.MAX_RETRIES
    };

    this.messageQueue.push(queuedMessage);
    await this.saveQueueToStorage();
    
    console.log(`[NetworkService] Queued message: ${messageId}`);
    
    if (this.isOnline) {
      this.processQueue();
    }
    
    return messageId;
  }

  private async processQueue() {
    if (!this.isOnline || this.messageQueue.length === 0) return;
    
    console.log(`[NetworkService] Processing ${this.messageQueue.length} queued messages`);
    
    const messagesToProcess = [...this.messageQueue];
    
    for (const message of messagesToProcess) {
      try {
        await this.sendQueuedMessage(message);
        this.messageQueue = this.messageQueue.filter(m => m.id !== message.id);
      } catch (error) {
        console.error(`[NetworkService] Failed to send queued message ${message.id}:`, error);
        
        const messageIndex = this.messageQueue.findIndex(m => m.id === message.id);
        if (messageIndex !== -1) {
          this.messageQueue[messageIndex].retryCount++;
          
          if (this.messageQueue[messageIndex].retryCount >= this.MAX_RETRIES) {
            console.log(`[NetworkService] Max retries reached for message ${message.id}, removing from queue`);
            this.messageQueue = this.messageQueue.filter(m => m.id !== message.id);
          }
        }
      }
    }
    
    await this.saveQueueToStorage();
    
    if (this.messageQueue.length > 0) {
      this.scheduleRetry();
    }
  }

  private scheduleRetry() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
    
    const minRetryCount = Math.min(...this.messageQueue.map(m => m.retryCount));
    const delay = this.RETRY_DELAYS[Math.min(minRetryCount, this.RETRY_DELAYS.length - 1)];
    
    console.log(`[NetworkService] Scheduling retry in ${delay}ms`);
    
    this.retryTimer = setTimeout(() => {
      this.processQueue();
    }, delay);
  }

  private async sendQueuedMessage(message: QueuedMessage): Promise<void> {
    throw new Error('sendQueuedMessage callback not implemented');
  }

  public setSendCallback(callback: (message: QueuedMessage) => Promise<void>) {
    this.sendQueuedMessage = callback;
  }

  public onNetworkChange(callback: (isOnline: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public isNetworkAvailable(): boolean {
    return this.isOnline;
  }

  public getQueuedMessages(conversationId?: string): QueuedMessage[] {
    if (conversationId) {
      return this.messageQueue.filter(m => m.conversationId === conversationId);
    }
    return [...this.messageQueue];
  }

  public async retryMessage(messageId: string): Promise<void> {
    const message = this.messageQueue.find(m => m.id === messageId);
    if (!message) return;
    
    try {
      await this.sendQueuedMessage(message);
      this.messageQueue = this.messageQueue.filter(m => m.id !== messageId);
      await this.saveQueueToStorage();
    } catch (error) {
      console.error(`[NetworkService] Manual retry failed for message ${messageId}:`, error);
      throw error;
    }
  }

  public async removeFromQueue(messageId: string): Promise<void> {
    this.messageQueue = this.messageQueue.filter(m => m.id !== messageId);
    await this.saveQueueToStorage();
  }

  public getRetryCount(messageId: string): number {
    const message = this.messageQueue.find(m => m.id === messageId);
    return message?.retryCount ?? 0;
  }
}

export default new NetworkService(); 