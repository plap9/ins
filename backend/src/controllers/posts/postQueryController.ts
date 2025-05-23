import { NextFunction, Request, Response } from "express";
import pool from "../../config/db";
import { RowDataPacket } from "mysql2";
import { AppException } from "../../middlewares/errorHandler";
import { ErrorCode } from "../../types/errorCode";
import { AuthRequest } from "../../middlewares/authMiddleware";
import { cachePostList, getCachePostsList } from "../../utils/cacheUtils";
import { invalidateCacheKey } from "../../utils/cacheUtils";

export const getPosts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const loggedInUserId = req.user?.user_id;
        if (!loggedInUserId) {
            return next(new AppException('Người dùng chưa xác thực để lấy bài viết.', ErrorCode.USER_NOT_AUTHENTICATED, 401));
        }

        const page = parseInt(req.query.page as string || "1", 10);
        const limit = parseInt(req.query.limit as string || "10", 10);
        const filterUserId = req.query.user_id ? parseInt(req.query.user_id as string, 10) : undefined;
        const forceRefresh = req.query._ ? true : false;

        if (isNaN(page) || page < 1) {
            return next(new AppException("Tham số 'page' không hợp lệ.", ErrorCode.VALIDATION_ERROR, 400));
        }
        const safeLimit = Math.min(Math.max(limit, 1), 50);
        if (isNaN(limit)) {
            return next(new AppException("Tham số 'limit' không hợp lệ.", ErrorCode.VALIDATION_ERROR, 400));
        }
        if (filterUserId !== undefined && isNaN(filterUserId)) {
            return next(new AppException("Tham số 'user_id' (filter) không hợp lệ.", ErrorCode.VALIDATION_ERROR, 400));
        }

        const offset = (page - 1) * safeLimit;

        const baseCacheKey = `posts:page:${page}:limit:${safeLimit}`;
        const filterCacheKey = filterUserId ? `:filterUser:${filterUserId}` : '';
        const cacheKey = `user:${loggedInUserId}:${baseCacheKey}${filterCacheKey}`;

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

        const queryParams: (string | number)[] = [loggedInUserId];

        let sqlQuery = `
            SELECT
                p.post_id, p.user_id, p.content, p.location, p.post_privacy,
                p.created_at, p.updated_at, p.like_count, p.comment_count,
                u.username, u.profile_picture,
                (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.post_id AND l.user_id = ?) > 0 AS is_liked,
                COALESCE(GROUP_CONCAT(DISTINCT m.media_url ORDER BY m.media_id SEPARATOR '||'), '') AS media_urls,
                COALESCE(GROUP_CONCAT(DISTINCT m.media_type ORDER BY m.media_id SEPARATOR '||'), '') AS media_types
            FROM posts p
            INNER JOIN users u ON p.user_id = u.user_id
            LEFT JOIN media m ON p.post_id = m.post_id
        `;

        let whereClause = "";
        const countParams: (string | number)[] = [];

        if (filterUserId) {
            whereClause = " WHERE p.user_id = ?";
            queryParams.push(filterUserId);
            countParams.push(filterUserId); 
        }

        sqlQuery += whereClause;
        sqlQuery += ` GROUP BY p.post_id ORDER BY p.created_at DESC LIMIT ${safeLimit} OFFSET ${offset}`;

        const [posts] = await pool.query<RowDataPacket[]>(sqlQuery, queryParams);

        const formattedPosts = posts.map(post => {
            console.log(`Post ${post.post_id}:`, {
                media_urls: post.media_urls,
                media_types: post.media_types,
            });
            
            return {
                ...post,
                is_liked: !!post.is_liked,
                media_urls: post.media_urls ? post.media_urls.split("||") : [],
                media_types: post.media_types ? post.media_types.split("||") : [],
            };
        });

        let countQuery = "SELECT COUNT(DISTINCT p.post_id) AS total FROM posts p";
        countQuery += whereClause;

        const [[totalRow]] = await pool.query<RowDataPacket[]>(countQuery, countParams);
        const totalPosts = totalRow.total || 0;
        const totalPage = Math.ceil(totalPosts / safeLimit);

        const paginationInfo = {
            page,
            limit: safeLimit,
            total: totalPosts,
            totalPage: totalPage
        };

        const resultToCacheAndSend = {
            posts: formattedPosts,
            pagination: paginationInfo
        };

        await cachePostList(cacheKey, resultToCacheAndSend, 60);

        res.status(200).json({
             success: true,
             ...resultToCacheAndSend,
             fromCache: false
         });

    } catch (error) {
        console.error("Error in getPosts:", error);
        next(error);
    }
};

export const deletePost = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        const post_id = parseInt(req.params.id, 10);
        if (isNaN(post_id)) {
            connection.release();
            return next(new AppException("Tham số 'id' không hợp lệ (phải là số).", ErrorCode.VALIDATION_ERROR, 400));
        }

        const user_id = req.user?.user_id;
        if (!user_id) {
            connection.release();
            return next(new AppException("Người dùng chưa được xác thực.", ErrorCode.USER_NOT_AUTHENTICATED, 401));
        }

        const [checkRows] = await connection.query<RowDataPacket[]>(
            "SELECT post_id FROM posts WHERE post_id = ? AND user_id = ?",
            [post_id, user_id]
        );

        if (checkRows.length === 0) {
            connection.release();
            return next(new AppException("Bạn không có quyền xóa bài viết này hoặc bài viết không tồn tại.", ErrorCode.INVALID_PERMISSIONS, 403));
        }

        await connection.beginTransaction();

        const deleteQueries = [
            "DELETE FROM media WHERE post_id = ?",
            "DELETE FROM likes WHERE post_id = ?",
            "DELETE FROM comments WHERE post_id = ?",
            "DELETE FROM saved_posts WHERE post_id = ?",
            "DELETE FROM tags WHERE post_id = ?",
            "DELETE FROM mentions WHERE post_id = ?",
            "DELETE FROM notifications WHERE post_id = ?",
            "DELETE FROM posts WHERE post_id = ?"
        ];

        for (const query of deleteQueries) {
            await connection.query(query, [post_id]);
        }

        await connection.commit();
        res.status(200).json({ success: true, message: "Xóa bài viết thành công" });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
         if (connection) connection.release();
    }
};