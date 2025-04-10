import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { logError, extractErrorInfo } from './errorUtils';
import { ErrorCode } from '../types/errorCode';

interface LocalStorage {
  setItem(key: string, value: string): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
}

interface RedisStorage {
  set(key: string, value: string): Promise<string>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
}

interface QueuedMessage {
  id: string;
  conversationId: string;
  senderId: number;
  content: string;
  mediaUrls?: string[];
  timestamp: number;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'delivered' | 'read';
  retryCount: number;
  localOnly?: boolean;
  clientId: string;
  version: number;
  lastSyncTimestamp?: number; 
  error?: string;
}

interface SyncResult {
  synced: QueuedMessage[];
  conflicts: Array<{
    local: QueuedMessage;
    remote: QueuedMessage;
    resolution: 'local' | 'remote' | 'merged';
  }>;
  failed: QueuedMessage[];
}

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export default class MessageQueueService {
  private redis: Redis | null = null;
  private messageQueues: Map<number, Map<string, QueuedMessage>> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private storage?: LocalStorage | RedisStorage;
  private redisClient?: Redis;
  private retryConfig: RetryConfig = {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2 
  };

  private networkStats = {
    sendAttempts: 0,
    sendSuccess: 0,
    sendFailures: 0,
    avgLatency: 0,
    lastNetworkCheck: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
  };

  private lastSyncTime: Map<number, number> = new Map();

  constructor(redisClient?: Redis) {
    if (redisClient) {
      this.redis = redisClient;
      this.redisClient = redisClient;
      
      this.storage = {
        async set(key: string, value: string): Promise<string> {
          return redisClient.set(key, value);
        },
        async get(key: string): Promise<string | null> {
          return redisClient.get(key);
        },
        async del(key: string): Promise<number> {
          return redisClient.del(key);
        }
      };
    } else if (typeof localStorage !== 'undefined') {
      this.storage = {
        setItem(key: string, value: string): void {
          localStorage.setItem(key, value);
        },
        getItem(key: string): string | null {
          return localStorage.getItem(key);
        },
        removeItem(key: string): void {
          localStorage.removeItem(key);
        }
      };
    }
  }

  public queueMessage(userId: number, message: Omit<QueuedMessage, 'id' | 'timestamp' | 'status' | 'retryCount' | 'version'>): QueuedMessage {
    if (!this.messageQueues.has(userId)) {
      this.messageQueues.set(userId, new Map());
    }

    const userQueue = this.messageQueues.get(userId)!;
    
    const queuedMessage: QueuedMessage = {
      id: uuidv4(),
      ...message,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      version: 1
    };

    userQueue.set(queuedMessage.id, queuedMessage);

    this.persistQueueToStorage(userId);

    return queuedMessage;
  }

  public getQueuedMessages(userId: number): QueuedMessage[] {
    const userQueue = this.messageQueues.get(userId);
    if (!userQueue) {
      return [];
    }
    
    return Array.from(userQueue.values());
  }

  public getPendingMessages(userId: number): QueuedMessage[] {
    const userQueue = this.messageQueues.get(userId);
    if (!userQueue) {
      return [];
    }
    
    return Array.from(userQueue.values())
      .filter(msg => msg.status === 'pending' || msg.status === 'failed');
  }

  public markMessageSent(userId: number, messageId: string, serverMessageId?: string): void {
    const userQueue = this.messageQueues.get(userId);
    if (!userQueue || !userQueue.has(messageId)) {
      return;
    }
    
    const message = userQueue.get(messageId)!;
    message.status = 'sent';
    message.version += 1;
    
    if (serverMessageId) {
      const updatedMessage = { ...message, id: serverMessageId };
      userQueue.delete(messageId);
      userQueue.set(serverMessageId, updatedMessage);
    } else {
      userQueue.set(messageId, message);
    }
    
    if (this.retryTimeouts.has(messageId)) {
      clearTimeout(this.retryTimeouts.get(messageId)!);
      this.retryTimeouts.delete(messageId);
    }
    
    this.persistQueueToStorage(userId);
  }

  public markMessageDelivered(userId: number, messageId: string): void {
    const userQueue = this.messageQueues.get(userId);
    if (!userQueue || !userQueue.has(messageId)) {
      return;
    }
    
    const message = userQueue.get(messageId)!;
    message.status = 'delivered';
    message.version += 1;
    userQueue.set(messageId, message);
    
    this.persistQueueToStorage(userId);
  }

  public markMessageRead(userId: number, messageId: string): void {
    const userQueue = this.messageQueues.get(userId);
    if (!userQueue || !userQueue.has(messageId)) {
      return;
    }
    
    const message = userQueue.get(messageId)!;
    message.status = 'read';
    message.version += 1;
    userQueue.set(messageId, message);
    
    this.persistQueueToStorage(userId);
  }

  public markMessageFailed(userId: number, messageId: string): void {
    const userQueue = this.messageQueues.get(userId);
    if (!userQueue || !userQueue.has(messageId)) {
      return;
    }
    
    const message = userQueue.get(messageId)!;
    message.status = 'failed';
    userQueue.set(messageId, message);
    
    this.persistQueueToStorage(userId);
  }

  public removeMessage(userId: number, messageId: string): void {
    const userQueue = this.messageQueues.get(userId);
    if (!userQueue || !userQueue.has(messageId)) {
      return;
    }
    
    if (this.retryTimeouts.has(messageId)) {
      clearTimeout(this.retryTimeouts.get(messageId)!);
      this.retryTimeouts.delete(messageId);
    }
    
    userQueue.delete(messageId);
    
    this.persistQueueToStorage(userId);
  }

  private persistQueueToStorage(userId: number): void {
    const userQueue = this.messageQueues.get(userId);
    if (!userQueue) {
      return;
    }
    
    const queueData = JSON.stringify(Array.from(userQueue.values()));
    
    if (this.redis) {
      this.redis.set(`message_queue:${userId}`, queueData)
        .catch(err => logError('MessageQueue', err, `Lỗi khi lưu vào Redis cho userId ${userId}`));
    }
    
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`message_queue:${userId}`, queueData);
      }
    } catch (err) {
      logError('MessageQueue', err, `Không thể lưu vào localStorage cho userId ${userId}`);
    }
  }

  public async loadQueueFromStorage(userId: number): Promise<void> {
    let queueData: string | null = null;
    
    if (this.redis) {
      try {
        queueData = await this.redis.get(`message_queue:${userId}`);
      } catch (err) {
        logError('MessageQueue', err, `Lỗi khi tải từ Redis cho userId ${userId}`);
      }
    }
    
    if (!queueData && typeof localStorage !== 'undefined') {
      try {
        queueData = localStorage.getItem(`message_queue:${userId}`);
      } catch (err) {
        logError('MessageQueue', err, `Không thể tải từ localStorage cho userId ${userId}`);
      }
    }
    
    if (queueData) {
      try {
        const messages = JSON.parse(queueData) as QueuedMessage[];
        const userQueue = new Map<string, QueuedMessage>();
        
        for (const message of messages) {
          userQueue.set(message.id, message);
        }
        
        this.messageQueues.set(userId, userQueue);
      } catch (err) {
        logError('MessageQueue', err, `Lỗi khi phân tích dữ liệu hàng đợi cho userId ${userId}`);
      }
    }
  }

  public async sendMessage(
    userId: number,
    messageId: string,
    sendCallback: (message: QueuedMessage) => Promise<boolean>
  ): Promise<boolean> {
    const userQueue = this.messageQueues.get(userId);
    if (!userQueue || !userQueue.has(messageId)) {
      return false;
    }
    
    const message = userQueue.get(messageId)!;
    
    message.status = 'sending';
    userQueue.set(messageId, message);
    
    try {
      const success = await sendCallback(message);
      
      if (success) {
        this.markMessageSent(userId, messageId);
        return true;
      } else {
        message.retryCount += 1;
        message.status = 'failed';
        userQueue.set(messageId, message);
        
        this.persistQueueToStorage(userId);
        
        if (message.retryCount < this.retryConfig.maxRetries) {
          this.scheduleRetry(userId, messageId, sendCallback);
        }
        
        return false;
      }
    } catch (error) {
      logError('MessageQueue', error, `Lỗi khi gửi tin nhắn ${messageId} cho userId ${userId}`);
      
      message.retryCount += 1;
      message.status = 'failed';
      message.error = extractErrorInfo(error);
      userQueue.set(messageId, message);
      
      this.persistQueueToStorage(userId);
      
      if (message.retryCount < this.retryConfig.maxRetries) {
        this.scheduleRetry(userId, messageId, sendCallback);
      }
      
      return false;
    }
  }

  private scheduleRetry(
    userId: number,
    messageId: string,
    sendCallback: (message: QueuedMessage) => Promise<boolean>
  ): void {
    const userQueue = this.messageQueues.get(userId);
    if (!userQueue || !userQueue.has(messageId)) {
      return;
    }
    
    const message = userQueue.get(messageId)!;
    
    const delay = Math.min(
      this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffFactor, message.retryCount - 1),
      this.retryConfig.maxDelay
    );
    
    if (this.retryTimeouts.has(messageId)) {
      clearTimeout(this.retryTimeouts.get(messageId)!);
    }
    
    const timeout = setTimeout(() => {
      this.retryTimeouts.delete(messageId);
      this.sendMessage(userId, messageId, sendCallback)
        .catch(err => logError('MessageQueue', err, `Lỗi khi thử lại tin nhắn ${messageId}`));
    }, delay);
    
    this.retryTimeouts.set(messageId, timeout);
    
    console.log(`[MessageQueue] Đặt lịch thử lại tin nhắn ${messageId} sau ${delay}ms (lần thử thứ ${message.retryCount})`);
  }

  public async retryAllFailedMessages(
    userId: number,
    sendCallback: (message: QueuedMessage) => Promise<boolean>
  ): Promise<number> {
    const failedMessages = this.getQueuedMessages(userId)
      .filter(msg => msg.status === 'failed');
    
    let successCount = 0;
    
    for (const message of failedMessages) {
      const success = await this.sendMessage(userId, message.id, sendCallback);
      if (success) {
        successCount++;
      }
    }
    
    return successCount;
  }

  public async syncMessages(
    userId: number,
    syncCallback: (localMessages: QueuedMessage[], lastSyncTimestamp?: number) => Promise<QueuedMessage[]>
  ): Promise<SyncResult> {
    const userQueue = this.messageQueues.get(userId);
    if (!userQueue) {
      return { synced: [], conflicts: [], failed: [] };
    }
    
    const lastSyncMessage = Array.from(userQueue.values())
      .sort((a, b) => (b.lastSyncTimestamp || 0) - (a.lastSyncTimestamp || 0))[0];
    const lastSyncTimestamp = lastSyncMessage?.lastSyncTimestamp;
    
    const localMessages = Array.from(userQueue.values());
    
    try {
      const remoteMessages = await syncCallback(localMessages, lastSyncTimestamp);
      
      return this.processSync(userId, localMessages, remoteMessages);
    } catch (error) {
      logError('MessageQueue', error, `Lỗi khi đồng bộ tin nhắn cho userId ${userId}`);
      return { synced: [], conflicts: [], failed: localMessages };
    }
  }

  private processSync(
    userId: number,
    localMessages: QueuedMessage[],
    remoteMessages: QueuedMessage[]
  ): SyncResult {
    const now = Date.now();
    const result: SyncResult = {
      synced: [],
      conflicts: [],
      failed: []
    };
    
    const userQueue = this.messageQueues.get(userId) || new Map<string, QueuedMessage>();
    
    const localMessagesByClientId = new Map<string, QueuedMessage>();
    localMessages.forEach(msg => {
      if (msg.clientId) {
        localMessagesByClientId.set(msg.clientId, msg);
      }
    });
    
    const localMessagesById = new Map<string, QueuedMessage>();
    localMessages.forEach(msg => {
      localMessagesById.set(msg.id, msg);
    });
    
    for (const remoteMsg of remoteMessages) {
      let localMsg: QueuedMessage | undefined;
      
      if (remoteMsg.clientId && localMessagesByClientId.has(remoteMsg.clientId)) {
        localMsg = localMessagesByClientId.get(remoteMsg.clientId);
      } else if (localMessagesById.has(remoteMsg.id)) {
        localMsg = localMessagesById.get(remoteMsg.id);
      }
      
      if (!localMsg) {
        userQueue.set(remoteMsg.id, {
          ...remoteMsg,
          lastSyncTimestamp: now
        });
        result.synced.push(remoteMsg);
        continue;
      }
      
      if (remoteMsg.version > localMsg.version) {
        userQueue.set(remoteMsg.id, {
          ...remoteMsg,
          lastSyncTimestamp: now
        });
        result.conflicts.push({
          local: localMsg,
          remote: remoteMsg,
          resolution: 'remote'
        });
      } else if (remoteMsg.version < localMsg.version) {
        userQueue.set(localMsg.id, {
          ...localMsg,
          lastSyncTimestamp: now
        });
        result.conflicts.push({
          local: localMsg,
          remote: remoteMsg,
          resolution: 'local'
        });
      } else {
        localMsg.lastSyncTimestamp = now;
        userQueue.set(localMsg.id, localMsg);
        result.synced.push(localMsg);
      }
    }
    
    this.messageQueues.set(userId, userQueue);
    
    this.persistQueueToStorage(userId);
    
    return result;
  }

  public resolveConflict(
    userId: number,
    originalId: string,
    resolution: 'local' | 'remote' | 'custom',
    customMessage?: QueuedMessage
  ): void {
    const userQueue = this.messageQueues.get(userId);
    if (!userQueue) {
      return;
    }
    
    if (resolution === 'custom' && customMessage) {
      customMessage.version += 1;
      customMessage.lastSyncTimestamp = Date.now();
      userQueue.set(originalId, customMessage);
    }
    
    this.persistQueueToStorage(userId);
  }

  public updateNetworkStats(success: boolean, latency?: number): void {
    this.networkStats.sendAttempts++;
    
    if (success) {
      this.networkStats.sendSuccess++;
      
      if (latency) {
        this.networkStats.avgLatency = 
          (this.networkStats.avgLatency * (this.networkStats.sendSuccess - 1) + latency) / 
          this.networkStats.sendSuccess;
      }
    } else {
      this.networkStats.sendFailures++;
    }
    
    this.networkStats.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.networkStats.lastNetworkCheck = Date.now();
  }

  public getRetryStrategy(): RetryConfig {
    const defaultStrategy = this.retryConfig;
    
    if (this.networkStats.sendAttempts < 5) {
      return defaultStrategy;
    }
    
    const failRate = this.networkStats.sendFailures / this.networkStats.sendAttempts;
    const isHighLatency = this.networkStats.avgLatency > 1000;
    
    if (failRate > 0.5 || !this.networkStats.isOnline) {
      return {
        maxRetries: defaultStrategy.maxRetries + 5,
        initialDelay: defaultStrategy.initialDelay * 2,
        maxDelay: defaultStrategy.maxDelay * 2,
        backoffFactor: defaultStrategy.backoffFactor
      };
    } else if (isHighLatency) {
      return {
        maxRetries: defaultStrategy.maxRetries + 2,
        initialDelay: defaultStrategy.initialDelay * 1.5,
        maxDelay: defaultStrategy.maxDelay * 1.5,
        backoffFactor: defaultStrategy.backoffFactor
      };
    }
    
    return defaultStrategy;
  }

  public shouldSyncNow(userId: number): boolean {
    const userQueue = this.messageQueues.get(userId);
    if (!userQueue || userQueue.size === 0) {
      return false;
    }
    
    const pendingMessages = Array.from(userQueue.values()).filter(
      msg => !msg.lastSyncTimestamp || Date.now() - msg.lastSyncTimestamp > 300000
    );
    
    if (pendingMessages.length >= 10) {
      return true;
    }
    
    const lastSyncTime = this.lastSyncTime.get(userId) || 0;
    const timeSinceLastSync = Date.now() - lastSyncTime;
    
    return this.networkStats.isOnline && 
           this.networkStats.sendFailures / this.networkStats.sendAttempts < 0.2 &&
           timeSinceLastSync > 300000;
  }

  private async handleRetry(
    userId: number,
    clientId: string, 
    retryCount: number
  ): Promise<boolean> {
    const userQueue = this.messageQueues.get(userId);
    if (!userQueue) return false;
    
    const message = userQueue.get(clientId);
    if (!message) return false;
    
    try {
      if (retryCount >= this.retryConfig.maxRetries) {
        message.status = 'failed';
        this.persistQueueToStorage(userId);
        return false;
      }
      
      const delay = Math.min(
        this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffFactor, retryCount),
        this.retryConfig.maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const success = await this.sendMessageToServer(userId, clientId);
      
      if (success) {
        message.status = 'sent';
        message.retryCount = 0;
        this.persistQueueToStorage(userId);
        return true;
      } else {
        message.retryCount = retryCount + 1;
        return this.handleRetry(userId, clientId, message.retryCount);
      }
    } catch (err: unknown) {
      logError('MessageQueue', err, `Lỗi khi thử lại tin nhắn ${clientId} cho userId ${userId}`);
      
      message.status = 'failed';
      message.error = extractErrorInfo(err);
      this.persistQueueToStorage(userId);
      return false;
    }
  }

  private async sendMessageToServer(userId: number, messageId: string): Promise<boolean> {
    try {
      const userQueue = this.messageQueues.get(userId);
      if (!userQueue || !userQueue.has(messageId)) {
        return false;
      }
      
      const message = userQueue.get(messageId)!;
      message.status = 'sending';
      
      const startTime = Date.now();
      this.networkStats.sendAttempts++;
      
      const success = await this.simulateSendToServer(message);
      
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      if (success) {
        this.networkStats.sendSuccess++;
        
        this.networkStats.avgLatency = 
          (this.networkStats.avgLatency * (this.networkStats.sendSuccess - 1) + latency) / 
          this.networkStats.sendSuccess;
        
        message.status = 'sent';
        message.version += 1;
        this.persistQueueToStorage(userId);
        return true;
      } else {
        this.networkStats.sendFailures++;
        message.status = 'failed';
        this.persistQueueToStorage(userId);
        return false;
      }
    } catch (err: unknown) {
      logError('MessageQueue', err, `Lỗi khi gửi tin nhắn ${messageId} cho userId ${userId}`);
      
      const userQueue = this.messageQueues.get(userId);
      if (userQueue && userQueue.has(messageId)) {
        const message = userQueue.get(messageId)!;
        message.status = 'failed';
        message.error = extractErrorInfo(err);
        this.persistQueueToStorage(userId);
      }
      
      this.networkStats.sendFailures++;
      return false;
    }
  }

  private async simulateSendToServer(message: QueuedMessage): Promise<boolean> {
    return new Promise((resolve) => {
      const delay = Math.floor(Math.random() * 400) + 100;
      
      const success = Math.random() > 0.2;
      
      setTimeout(() => {
        resolve(success);
      }, delay);
    });
  }
} 