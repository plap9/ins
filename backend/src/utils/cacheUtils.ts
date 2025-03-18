import { redisClient } from '../config/redis';

const SENSITIVE_FIELDS = [
  'password_hash',
  'verification_token',
  'phone_verification_code'
];
const COMMENT_CACHE_EXPIRY = 300;

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