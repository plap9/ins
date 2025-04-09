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

export const getUserByUsername = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username } = req.params;
    
    console.log(`[getUserByUsername] Tìm kiếm người dùng với username: ${username}`);
    
    if (!username) {
      return next(new AppError("Username is required", 400));
    }

    const [userCheck] = await pool.query<RowDataPacket[]>(
      `SELECT user_id, username, full_name, profile_picture, bio, is_private, created_at, updated_at FROM users WHERE username = ?`, 
      [username]
    );

    console.log(`[getUserByUsername] Kết quả kiểm tra người dùng:`, userCheck);

    if (userCheck.length === 0) {
      return next(new AppError("User not found", 404));
    }

    const userId = userCheck[0].user_id;

    const [[postCount]] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM posts WHERE user_id = ?`,
      [userId]
    );

    const [[followerCount]] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM followers WHERE following_id = ?`,
      [userId]
    );

    const [[followingCount]] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM followers WHERE follower_id = ?`,
      [userId]
    );

    console.log(`[getUserByUsername] Thống kê: posts=${postCount?.count}, followers=${followerCount?.count}, following=${followingCount?.count}`);

    const userData = {
      id: userCheck[0].user_id,
      username: userCheck[0].username,
      full_name: userCheck[0].full_name,
      avatar_url: userCheck[0].profile_picture,
      bio: userCheck[0].bio || "",
      is_private: Boolean(userCheck[0].is_private),
      created_at: userCheck[0].created_at,
      updated_at: userCheck[0].updated_at,
      followers_count: followerCount?.count || 0,
      following_count: followingCount?.count || 0,
      posts_count: postCount?.count || 0,
      is_following: false 
    };

    console.log(`[getUserByUsername] Trả về dữ liệu người dùng:`, userData);

    res.json({
      success: true,
      data: userData,
      user: { 
        user_id: userCheck[0].user_id,
        username: userCheck[0].username,
        full_name: userCheck[0].full_name,
        profile_picture: userCheck[0].profile_picture,
        bio: userCheck[0].bio || "",
        is_private: Boolean(userCheck[0].is_private),
        post_count: postCount?.count || 0,
        follower_count: followerCount?.count || 0,
        following_count: followingCount?.count || 0
      },
      source: "database"
    });
  } catch (error) {
    console.error(`[getUserByUsername] Lỗi:`, error);
    next(error);
  }
};
