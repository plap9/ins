import { redisClient } from '../config/redis';
import pool from '../config/db';
import { RowDataPacket } from 'mysql2';

const SENSITIVE_FIELDS = [
  'password_hash',
  'verification_token',
  'phone_verification_code'
];
const COMMENT_CACHE_EXPIRY = 300;
const USER_CACHE_EXPIRY = 900; 
const USER_LIST_CACHE_EXPIRY = 600; 
const USER_QUEUE_EXPIRY = 3600;

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

export const cachePostList = async (key: string, postsData: any, expireTime = 900) => {
  await redisClient.setex(
    `posts:${key}`,
    expireTime,
    JSON.stringify(postsData)
  )
};

export const getCachePostsList = async (key: string) => {
  const data = await redisClient.get(`posts:${key}`);
  return data ? JSON.parse(data) : null;
};

export const invalidatePostsListCache = async (userId?: number) => {
  if (userId) {
    const keys = await redisClient.keys(`posts:user:${userId}:*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  }

  const generalKeys = await redisClient.keys('posts:page:*');
  if (generalKeys.length > 0) {
    await redisClient.del(generalKeys);
  }
};

export const cacheLikes = async (postId: number, likeData: any, page = 1, limit = 20 ) => {
  await redisClient.setex(
    `likes:post:${postId}:page:${page}:limit:${limit}`,
    300,
    JSON.stringify(likeData)
  )
};

export const getCacheLikes = async (postId: number, page = 1, limit =20) => {
  const data = await redisClient.get(`likes:post:${postId}:page:${page}:limit:${limit}`);
  return data ? JSON.parse(data) : null;
};

export const invalidateLikesCache = async (postId: number) => {
  const keys = await redisClient.keys(`likes:post:${postId}:*`);
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
};

export const cacheUserLikeStatus = async (userId: number, postId: number, status: boolean) => {
  await redisClient.setex(
    `user:${userId}:liked:${postId}`,
    3600, 
    status ? '1' : '0'
  );
};

export const invalidateUserLikeStatus = async (userId: number, postId: number) => {
  await redisClient.del(`user:${userId}:liked:${postId}`);
};

export const storeRefreshToken = async (userId: number, token: string) => {
  await redisClient.setex(`refresh_token:${token}`, 7 * 24 * 60 * 60, userId.toString());
};

export const getRefreshTokenUserId = async (token: string) => {
  const userId = await redisClient.get(`refresh_token:${token}`);
  return userId ? parseInt(userId, 10) : null;
};

export const invalidateRefreshToken = async (token: string) => {
  await redisClient.del(`refresh_token:${token}`);
};

export const blacklistToken = async (token: string, expiryTime: number) => {
  await redisClient.setex(`blacklist:${token}`, expiryTime, '1');
};

export const cachePostCounts = async (postId: number, likeCount: number, commentCount: number) => {
  await redisClient.setex(
    `post:${postId}:counts`,
    900, 
    JSON.stringify({ likeCount, commentCount })
  );
};

export const getCachedPostCounts = async (postId: number) => {
  const data = await redisClient.get(`post:${postId}:counts`);
  return data ? JSON.parse(data) : null;
};

export const updateCachedLikeCount = async (postId: number, increment: boolean) => {
  const counts = await getCachedPostCounts(postId);
  if (counts) {
    counts.likeCount = increment ? counts.likeCount + 1 : Math.max(0, counts.likeCount - 1);
    await cachePostCounts(postId, counts.likeCount, counts.commentCount);
  }
};

export const cacheComments = async (key: string, data: any) => {
  await redisClient.setex(
    `comments:${key}`,
    COMMENT_CACHE_EXPIRY,
    JSON.stringify(data)
  )
};

export const getCachedComments = async (key: string) => {
  const data = await redisClient.get(`comments:${key}`);
  return data ? JSON.parse(data) : null;
};

export const invalidateCommentsCache = async (postId : number) => {
  const keys = await redisClient.keys(`comments:post:${postId}:*`);
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
};

export const invalidateCommentCache = async (commentId : number) => {
  const keys = await redisClient.keys(`comments:comment:${commentId}:*`);
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
};

export const cacheCommentLikes = async (commentId: number, data: any, page = 1, limit = 20) => {
  await redisClient.setex(
    `likes:comment:${commentId}:page:${page}:limit:${limit}`,
    COMMENT_CACHE_EXPIRY,
    JSON.stringify(data)
  )
};

export const getCachedCommentLikes = async (commentId :number, page = 1, limit = 20) => {
  const data = await redisClient.get(`likes:comment:${commentId}:page:${page}:limit:${limit}`);
  return data ? JSON.parse(data) : null;
}

export const invalidateCommentLikesCache = async (commentId: number) => {
  const keys = await redisClient.keys(`like:comment:${commentId}:*`);
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
};

export const cacheUserProfile = async (userId: number, userData: any) => {
  const safeData = sanitizeUserData(userData);
  await redisClient.setex(
    `user:profile:${userId}`,
    USER_CACHE_EXPIRY,
    JSON.stringify(safeData)
  );
};

export const getCachedUserProfile = async (userId: number) => {
  const data = await redisClient.get(`user:profile:${userId}`);
  return data ? JSON.parse(data) : null;
};

export const invalidateUserProfileCache = async (userId: number) => {
  await redisClient.del(`user:profile:${userId}`);
};

export const cacheUserList = async (key: string, usersData: any[], page = 1, limit = 20) => {
  const safeData = usersData.map(user => sanitizeUserData(user));
  await redisClient.setex(
    `users:${key}:page:${page}:limit:${limit}`,
    USER_LIST_CACHE_EXPIRY,
    JSON.stringify(safeData)
  );
};

export const getCachedUserList = async (key: string, page = 1, limit = 20) => {
  const data = await redisClient.get(`users:${key}:page:${page}:limit:${limit}`);
  return data ? JSON.parse(data) : null;
};

export const invalidateUserListCache = async (keyPattern: string) => {
  const keys = await redisClient.keys(`users:${keyPattern}:*`);
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
};

export const addUserToQueue = async (
  queueName: string,
  targetUserId: number,
  sourceUserId: number,
  metadata: object = {}
) => {
  const queueItem = {
    sourceUserId,
    timestamp: Date.now(),
    ...metadata
  };

  await redisClient.lpush(
    `queue:${queueName}:${targetUserId}`,
    JSON.stringify(queueItem)
  );
  
  await redisClient.expire(`queue:${queueName}:${targetUserId}`, USER_QUEUE_EXPIRY);
};

export const getUserQueue = async (
  queueName: string,
  userId: number,
  start = 0,
  end = -1
) => {
  const items = await redisClient.lrange(`queue:${queueName}:${userId}`, start, end);
  return items.map(item => JSON.parse(item));
};

export const removeFromUserQueue = async (
  queueName: string,
  userId: number,
  index = -1
) => {
  const key = `queue:${queueName}:${userId}`;
  
  if (index === -1) {
    await redisClient.del(key);
  } else {
    const items = await redisClient.lrange(key, index, index);
    if (items.length > 0) {
      await redisClient.lrem(key, 1, items[0]);
    }
  }
};

export const cacheUserSearch = async (
  query: string,
  results: any[],
  page = 1,
  limit = 20
) => {
  await cacheUserList(`search:${query.toLowerCase()}`, results, page, limit);
};

export const getCachedUserSearch = async (
  query: string,
  page = 1,
  limit = 20
) => {
  return await getCachedUserList(`search:${query.toLowerCase()}`, page, limit);
};

export const cacheUserSettings = async (userId: number, settings: any) => {
  await redisClient.setex(
    `user:settings:${userId}`,
    USER_CACHE_EXPIRY,
    JSON.stringify(settings)
  );
};

export const getCachedUserSettings = async (userId: number) => {
  const data = await redisClient.get(`user:settings:${userId}`);
  return data ? JSON.parse(data) : null;
};

export const invalidateUserSettingsCache = async (userId: number) => {
  await redisClient.del(`user:settings:${userId}`);
};

export const getUserProfileWithCache = async (userId: number) => {
  const cachedUser = await getCachedUserProfile(userId);
  if (cachedUser) {
    return cachedUser;
  }

  const [users] = await pool.query<RowDataPacket[]>(
    `SELECT
      user_id,
      username,
      email,
      full_name,
      bio,
      profile_picture,
      phone_number,
      is_private,
      is_verified,
      website,
      gender,
      date_of_birth,
      created_at,
      updated_at,
      last_login,
      status
    FROM users
    WHERE user_id = ?`,
    [userId]
  );

  if (users.length === 0) {
    return null;
  }

  await cacheUserProfile(userId, users[0]);
  return sanitizeUserData(users[0]);
};

export const cacheData = async (key: string, data: any, expireTime = USER_CACHE_EXPIRY) => {
  const safeData = typeof data === 'object' ? sanitizeUserData(data) : data;
  await redisClient.setex(
    key,
    expireTime,
    JSON.stringify(safeData)
  );
};

export const getCachedData = async (key: string) => {
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

export const invalidateCacheKey = async (key: string) => {
  await redisClient.del(key);
};

export const invalidatePostCache = async (postId: number) => {
  const key = `post:${postId}`;
  await redisClient.del(key);
};  