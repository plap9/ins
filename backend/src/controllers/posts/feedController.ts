import { NextFunction, Response } from "express";
import pool from "../../config/db";
import { RowDataPacket } from "mysql2";
import { AppException } from "../../middlewares/errorHandler";
import { ErrorCode } from "../../types/errorCode";
import { AuthRequest } from "../../middlewares/authMiddleware";
import { cachePostList, getCachePostsList, invalidateCacheKey } from "../../utils/cacheUtils";

interface FeedPost extends RowDataPacket {
    post_id: number;
    user_id: number;
    content: string;
    location?: string;
    post_privacy: string;
    created_at: string;
    updated_at: string;
    like_count: number;
    comment_count: number;
    username: string;
    profile_picture?: string;
    is_liked: boolean;
    media_urls: string;
    media_types: string;
    feed_type: 'following' | 'discover';
    engagement_score?: number;
}

export const getFeed = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const loggedInUserId = req.user?.user_id;
        if (!loggedInUserId) {
            return next(new AppException('Người dùng chưa xác thực để lấy feed.', ErrorCode.USER_NOT_AUTHENTICATED, 401));
        }

        const page = parseInt(req.query.page as string || "1", 10);
        const limit = parseInt(req.query.limit as string || "10", 10);
        const feedType = req.query.type as string || "mixed"; // "following", "discover", "mixed"
        const forceRefresh = req.query._ ? true : false;

        if (isNaN(page) || page < 1) {
            return next(new AppException("Tham số 'page' không hợp lệ.", ErrorCode.VALIDATION_ERROR, 400));
        }
        
        const safeLimit = Math.min(Math.max(limit, 1), 50);
        if (isNaN(limit)) {
            return next(new AppException("Tham số 'limit' không hợp lệ.", ErrorCode.VALIDATION_ERROR, 400));
        }

        const offset = (page - 1) * safeLimit;

        // Cache key
        const cacheKey = `user:${loggedInUserId}:feed:${feedType}:page:${page}:limit:${safeLimit}`;

        let useCache = !forceRefresh;
        let cachedData = null;
        
        if (useCache) {
            cachedData = await getCachePostsList(cacheKey);
            if (cachedData) {
                res.status(200).json({ success: true, ...cachedData, fromCache: true });
                return;
            }
        } else {
            try {
                await invalidateCacheKey(cacheKey);
            } catch (err) {
                console.warn("Không thể xóa cache:", err);
            }
        }

        // Kiểm tra số người đang follow
        const [[followingCount]] = await pool.query<RowDataPacket[]>(
            "SELECT COUNT(*) as count FROM followers WHERE follower_id = ?",
            [loggedInUserId]
        );

        const isFollowingAnyone = followingCount.count > 0;
        let posts: FeedPost[] = [];

        if (feedType === "following" && !isFollowingAnyone) {
            // Nếu chưa follow ai và yêu cầu following feed, trả về empty
            posts = [];
        } else if (feedType === "discover" || (!isFollowingAnyone && feedType === "mixed")) {
            // Discover feed hoặc mixed feed khi chưa follow ai
            posts = await getDiscoverFeed(loggedInUserId, safeLimit, offset);
        } else if (feedType === "following" || feedType === "mixed") {
            // Following feed hoặc mixed feed
            posts = await getFollowingFeed(loggedInUserId, safeLimit, offset, feedType === "mixed");
        }

        // Format posts
        const formattedPosts = posts.map(post => ({
            ...post,
            is_liked: !!post.is_liked,
            media_urls: post.media_urls ? post.media_urls.split("||") : [],
            media_types: post.media_types ? post.media_types.split("||") : [],
        }));

        // Pagination info
        const totalPosts = formattedPosts.length;
        const hasMore = totalPosts === safeLimit;

        const paginationInfo = {
            page,
            limit: safeLimit,
            total: totalPosts,
            hasMore,
            feedType,
            isFollowingAnyone
        };

        const resultToCacheAndSend = {
            posts: formattedPosts,
            pagination: paginationInfo
        };

        // Cache for 5 minutes (shorter than regular posts)
        await cachePostList(cacheKey, resultToCacheAndSend, 300);

        res.status(200).json({
            success: true,
            ...resultToCacheAndSend,
            fromCache: false
        });

    } catch (error) {
        console.error("Error in getFeed:", error);
        next(error);
    }
};

async function getFollowingFeed(userId: number, limit: number, offset: number, includeMixed: boolean = false): Promise<FeedPost[]> {
    let query = `
        SELECT
            p.post_id, p.user_id, p.content, p.location, p.post_privacy,
            p.created_at, p.updated_at, p.like_count, p.comment_count,
            u.username, u.profile_picture,
            (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.post_id AND l.user_id = ?) > 0 AS is_liked,
            COALESCE(GROUP_CONCAT(DISTINCT m.media_url ORDER BY m.media_id SEPARATOR '||'), '') AS media_urls,
            COALESCE(GROUP_CONCAT(DISTINCT m.media_type ORDER BY m.media_id SEPARATOR '||'), '') AS media_types,
            'following' as feed_type,
            (p.like_count * 2 + p.comment_count * 3) as engagement_score
        FROM posts p
        INNER JOIN users u ON p.user_id = u.user_id
        INNER JOIN followers f ON p.user_id = f.following_id AND f.follower_id = ?
        LEFT JOIN media m ON p.post_id = m.post_id
        WHERE p.post_privacy IN ('public', 'followers')
    `;

    if (includeMixed) {
        // Mixed feed: 70% following, 30% discover
        const followingLimit = Math.ceil(limit * 0.7);
        const discoverLimit = limit - followingLimit;
        
        query += ` GROUP BY p.post_id ORDER BY p.created_at DESC LIMIT ${followingLimit} OFFSET ${offset}`;
        
        const [followingPosts] = await pool.query<FeedPost[]>(query, [userId, userId]);
        
        if (followingPosts.length < limit) {
            const discoverPosts = await getDiscoverFeed(userId, discoverLimit, 0);
            return [...followingPosts, ...discoverPosts].slice(0, limit);
        }
        
        return followingPosts;
    } else {
        query += ` GROUP BY p.post_id ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
        const [posts] = await pool.query<FeedPost[]>(query, [userId, userId]);
        return posts;
    }
}

async function getDiscoverFeed(userId: number, limit: number, offset: number): Promise<FeedPost[]> {
    const query = `
        SELECT
            p.post_id, p.user_id, p.content, p.location, p.post_privacy,
            p.created_at, p.updated_at, p.like_count, p.comment_count,
            u.username, u.profile_picture,
            (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.post_id AND l.user_id = ?) > 0 AS is_liked,
            COALESCE(GROUP_CONCAT(DISTINCT m.media_url ORDER BY m.media_id SEPARATOR '||'), '') AS media_urls,
            COALESCE(GROUP_CONCAT(DISTINCT m.media_type ORDER BY m.media_id SEPARATOR '||'), '') AS media_types,
            'discover' as feed_type,
            (p.like_count * 2 + p.comment_count * 3 + 
             CASE WHEN p.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 10 ELSE 0 END) as engagement_score
        FROM posts p
        INNER JOIN users u ON p.user_id = u.user_id
        LEFT JOIN media m ON p.post_id = m.post_id
        WHERE p.post_privacy = 'public'
        AND p.user_id != ?
        AND p.user_id NOT IN (
            SELECT following_id FROM followers WHERE follower_id = ?
        )
        GROUP BY p.post_id 
        ORDER BY engagement_score DESC, p.created_at DESC 
        LIMIT ? OFFSET ?
    `;

    const [posts] = await pool.query<FeedPost[]>(query, [userId, userId, userId, limit, offset]);
    return posts;
}

export const getSuggestedUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.user_id;
        const limit = Math.min(Math.max(parseInt(req.query.limit as string || '10', 10), 5), 20);

        if (!userId) {
            return next(new AppException("Người dùng chưa được xác thực", ErrorCode.USER_NOT_AUTHENTICATED, 401));
        }

        // Lấy suggested users dựa trên mutual follows và popularity
        const [suggestedUsers] = await pool.query<RowDataPacket[]>(`
            SELECT 
                u.user_id,
                u.username,
                u.full_name,
                u.profile_picture,
                u.bio,
                u.followers_count,
                u.following_count,
                FALSE as is_following,
                COALESCE(mutual.mutual_count, 0) as mutual_follows_count
            FROM users u
            LEFT JOIN (
                SELECT 
                    f2.following_id as user_id,
                    COUNT(*) as mutual_count
                FROM followers f1
                INNER JOIN followers f2 ON f1.following_id = f2.follower_id
                WHERE f1.follower_id = ?
                AND f2.following_id != ?
                AND f2.following_id NOT IN (
                    SELECT following_id FROM followers WHERE follower_id = ?
                )
                GROUP BY f2.following_id
            ) mutual ON u.user_id = mutual.user_id
            WHERE u.user_id != ?
            AND u.user_id NOT IN (
                SELECT following_id FROM followers WHERE follower_id = ?
            )
            ORDER BY 
                mutual.mutual_count DESC,
                u.followers_count DESC, 
                u.created_at DESC
            LIMIT ?
        `, [userId, userId, userId, userId, userId, limit]);

        res.status(200).json({
            success: true,
            suggested_users: suggestedUsers.map(user => ({
                user_id: user.user_id,
                username: user.username,
                full_name: user.full_name,
                profile_picture: user.profile_picture,
                bio: user.bio,
                followers_count: user.followers_count,
                following_count: user.following_count,
                mutual_follows_count: user.mutual_follows_count,
                is_following: false
            }))
        });

    } catch (error) {
        next(error);
    }
};

export const getFollowingStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.user_id;

        if (!userId) {
            return next(new AppException("Người dùng chưa được xác thực", ErrorCode.USER_NOT_AUTHENTICATED, 401));
        }

        const [[counts]] = await pool.query<RowDataPacket[]>(`
            SELECT 
                (SELECT COUNT(*) FROM followers WHERE follower_id = ?) as following_count,
                (SELECT COUNT(*) FROM followers WHERE following_id = ?) as followers_count
        `, [userId, userId]);

        const isFollowingAnyone = counts.following_count > 0;

        res.status(200).json({
            success: true,
            user_id: userId,
            following_count: counts.following_count || 0,
            followers_count: counts.followers_count || 0,
            is_following_anyone: isFollowingAnyone,
            feed_recommendation: isFollowingAnyone ? "mixed" : "discover"
        });

    } catch (error) {
        next(error);
    }
}; 