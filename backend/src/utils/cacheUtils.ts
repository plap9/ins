import { redisClient } from '../config/redis';

const SENSITIVE_FIELDS = [
  'password_hash',
  'verification_token',
  'phone_verification_code'
];

export const sanitizeUserData = (user: any) => {
  const sanitized = { ...user };
  SENSITIVE_FIELDS.forEach(field => delete sanitized[field]);
  return sanitized;
};

export const cacheUser = async (userId: number, userData: any) => {
  const safeData = sanitizeUserData(userData);
  await redisClient.setex(
    `user:${userId}`,
    900, 
    JSON.stringify(safeData)
  );
};

export const getCachedUser = async (userId: number) => {
  const data = await redisClient.get(`user:${userId}`);
  return data ? JSON.parse(data) : null;
};