import { NextFunction, Request, Response } from 'express';
import pool from '../../config/db';
import { AppError } from '../../middlewares/errorHandler';
import { ErrorCode } from '../../types/errorCode';
import { RowDataPacket } from 'mysql2';
import { 
    cacheUserProfile, 
    getCachedUserProfile, 
    invalidateUserProfileCache 
  } from '../../utils/cacheUtils';

export const getUserProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return next(new AppError("Tham số 'id' không hợp lệ.", 400, ErrorCode.USER_NOT_FOUND));
        }

        const cachedUser = await getCachedUserProfile(userId);
        if (cachedUser) {
            res.status(200).json({ success: true, user: cachedUser, source: 'cache' });
            return;
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
            return next(new AppError("Người dùng không tồn tại.", 404, ErrorCode.USER_NOT_FOUND));
        }

        const [[postCountResult]] = await pool.query<RowDataPacket[]>(
            `SELECT COUNT(*) as post_count FROM posts WHERE user_id = ?`,
            [userId]
        );

        const [[followerCountResult]] = await pool.query<RowDataPacket[]>(
            `SELECT COUNT(*) as follower_count FROM followers WHERE following_id = ?`,
            [userId]
        );

        const [[followingCountResult]] = await pool.query<RowDataPacket[]>(
            `SELECT COUNT(*) as following_count FROM followers WHERE follower_id = ?`,
            [userId]
        );

        const userWithStats = {
            ...users[0],
            post_count: postCountResult?.post_count || 0,
            follower_count: followerCountResult?.follower_count || 0,
            following_count: followingCountResult?.following_count || 0
        };

        await cacheUserProfile(userId, userWithStats);

        res.status(200).json({ success: true, user: userWithStats, source: 'database' });
    } catch (error) {
        next(error);
    }
};
