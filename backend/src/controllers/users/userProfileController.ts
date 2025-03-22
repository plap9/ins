import { NextFunction, Request, Response } from 'express';
import pool from '../../config/db';
import { AppError, ErrorCode } from '../../middlewares/errorHandler';
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

        await cacheUserProfile(userId, users[0]);

        res.status(200).json({ success: true, user: users[0], source: 'database' });
    } catch (error) {
        next(error);
    }
};
