import Redis from 'ioredis';
import { Queue } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

interface UserData {
  id: number;
  email: string;
  phone?: string;
  [key: string]: any;
}

interface TokenPayload {
  userId: number;
  iat: number;
  exp: number;
}

interface EmailJobData {
  email: string;
  token: string;
}

interface SMSJobData {
  phone: string;
  code: string;
}

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

export const redisClient = new Redis(redisConfig);

export const emailQueue = new Queue<EmailJobData>('email-queue', {
  connection: redisClient.duplicate(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

export const smsQueue = new Queue<SMSJobData>('sms-queue', {
  connection: redisClient.duplicate(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 3000
    }
  }
});

const TOKEN_CACHE_EXPIRY = 60 * 60;
const USER_CACHE_EXPIRY = 60 * 15;

export const cacheUtils = {
  async getCachedUser(userId: number): Promise<UserData | null> {
    const cachedUser = await redisClient.get(`user:${userId}`);
    return cachedUser ? JSON.parse(cachedUser) : null;
  },

  async setCachedUser(userId: number, userData: UserData): Promise<void> {
    const { password, verificationToken, ...safeData } = userData;
    await redisClient.setex(
      `user:${userId}`,
      USER_CACHE_EXPIRY,
      JSON.stringify(safeData)
    );
  },

  async invalidateUserCache(userId: number): Promise<void> {
    await redisClient.del(`user:${userId}`);
  },

  async storeRefreshToken(token: string, userId: string, expiryInDays = 7): Promise<void> {
    await redisClient.setex(
      `refresh_token:${token}`,
      expiryInDays * 24 * 60 * 60,
      userId.toString()
    );
  },

  async getRefreshTokenUserId(token: string): Promise<number | null> {
    const userId = await redisClient.get(`refresh_token:${token}`);
    return userId ? parseInt(userId, 10) : null;
  },

  async invalidateRefreshToken(token: string): Promise<void> {
    await redisClient.del(`refresh_token:${token}`);
  },

  async blacklistToken(token: string, expiryInSeconds: number): Promise<void> {
    await redisClient.setex(`blacklist:${token}`, expiryInSeconds, '1');
  },

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await redisClient.get(`blacklist:${token}`);
    return result === '1';
  }
};

const handleRedisEvents = () => {
  if (process.env.NODE_ENV === 'test') return;

  redisClient
    .on('connect', () => console.log(' Đã kết nối thành công đến Redis'))
    .on('error', (err) => console.error(' Lỗi kết nối Redis:', err.message))
    .on('reconnecting', () => console.log('🔄 Đang kết nối lại Redis...'))
    .on('close', () => console.log('🚪 Đã đóng kết nối Redis'));
};

handleRedisEvents();