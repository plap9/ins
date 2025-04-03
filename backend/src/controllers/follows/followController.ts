import { Request, Response } from "express";
import pool from "../../config/db";
import { AuthRequest } from "../../middlewares/authMiddleware"; 
import { AppError } from "../../middlewares/errorHandler";
import { ErrorCode } from "../../types/errorCode";
import { RowDataPacket, OkPacket, ResultSetHeader } from "mysql2";

interface UserRow extends RowDataPacket {
  user_id: number;
  username?: string;
  full_name?: string;
  profile_picture?: string | null;
  is_private?: number;
  is_verified?: number;
  allow_follow_notifications?: number;
  allow_follow_requests?: number;
}

interface FollowRow extends RowDataPacket {
  id: number;
}

interface CountRow extends RowDataPacket {
  followers_count: number;
  following_count: number;
}

interface BlockRow extends RowDataPacket {
  block_id: number;
}

export const getFollowing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    const targetUserId = parseInt(req.params.userId) || userId;
    
    const [userExists] = await pool.query<UserRow[]>(
      "SELECT user_id FROM users WHERE user_id = ?",
      [targetUserId]
    );
    
    if (userExists.length === 0) {
      throw new AppError("Người dùng không tồn tại", 404, ErrorCode.USER_NOT_FOUND);
    }

    if (targetUserId !== userId) {
      const [privacyCheck] = await pool.query<UserRow[]>(
        `SELECT is_private FROM users WHERE user_id = ?`,
        [targetUserId]
      );
      
      const isPrivate = privacyCheck[0]?.is_private === 1;
      
      if (isPrivate) {  
        const [followCheck] = await pool.query<FollowRow[]>(
          `SELECT id FROM followers WHERE follower_id = ? AND following_id = ?`,
          [userId, targetUserId]
        );
        
        if (followCheck.length === 0) {
          throw new AppError(
            "Không thể xem danh sách theo dõi của tài khoản riêng tư", 
            403, 
            ErrorCode.USER_PROFILE_ACCESS_DENIED
          );
        }
      }
    }

    const [following] = await pool.query<RowDataPacket[]>(
      `SELECT u.user_id, u.username, u.full_name, u.profile_picture, u.is_verified,
       (SELECT COUNT(*) FROM followers WHERE follower_id = ? AND following_id = u.user_id) AS is_following
       FROM users u
       JOIN followers f ON u.user_id = f.following_id
       WHERE f.follower_id = ?
       ORDER BY f.created_at DESC`,
      [userId, targetUserId]
    );

    res.status(200).json({
      status: "success",
      data: following
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Lỗi khi lấy danh sách đang theo dõi", 500, ErrorCode.SERVER_ERROR);
  }
};

export const getFollowers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    const targetUserId = parseInt(req.params.userId) || userId;
    
    const [userExists] = await pool.query<UserRow[]>(
      "SELECT user_id FROM users WHERE user_id = ?",
      [targetUserId]
    );
    
    if (userExists.length === 0) {
      throw new AppError("Người dùng không tồn tại", 404, ErrorCode.USER_NOT_FOUND);
    }

    if (targetUserId !== userId) {
      const [privacyCheck] = await pool.query<UserRow[]>(
        `SELECT is_private FROM users WHERE user_id = ?`,
        [targetUserId]
      );
      
      const isPrivate = privacyCheck[0]?.is_private === 1;
      
      if (isPrivate) {
        const [followCheck] = await pool.query<FollowRow[]>(
          `SELECT id FROM followers WHERE follower_id = ? AND following_id = ?`,
          [userId, targetUserId]
        );
        
        if (followCheck.length === 0) {
          throw new AppError(
            "Không thể xem danh sách người theo dõi của tài khoản riêng tư", 
            403, 
            ErrorCode.USER_PROFILE_ACCESS_DENIED
          );
        }
      }
    }

    const [followers] = await pool.query<RowDataPacket[]>(
      `SELECT u.user_id, u.username, u.full_name, u.profile_picture, u.is_verified,
       (SELECT COUNT(*) FROM followers WHERE follower_id = ? AND following_id = u.user_id) AS is_following
       FROM users u
       JOIN followers f ON u.user_id = f.follower_id
       WHERE f.following_id = ?
       ORDER BY f.created_at DESC`,
      [userId, targetUserId]
    );

    res.status(200).json({
      status: "success",
      data: followers
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Lỗi khi lấy danh sách người theo dõi", 500, ErrorCode.SERVER_ERROR);
  }
};

export const followUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    const targetUserId = parseInt(req.params.userId);
    
    if (!targetUserId) {
      throw new AppError("ID người dùng không hợp lệ", 400, ErrorCode.VALIDATION_ERROR);
    }
    
    if (userId === targetUserId) {
      throw new AppError("Không thể tự theo dõi chính mình", 400, ErrorCode.INVALID_OPERATION);
    }

    const [userExists] = await pool.query<UserRow[]>(
      "SELECT user_id, is_private, allow_follow_requests, allow_follow_notifications FROM users WHERE user_id = ?",
      [targetUserId]
    );
    
    if (userExists.length === 0) {
      throw new AppError("Người dùng không tồn tại", 404, ErrorCode.USER_NOT_FOUND);
    }

    const [isBlocked] = await pool.query<BlockRow[]>(
      "SELECT block_id FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?",
      [targetUserId, userId]
    );
    
    if (isBlocked.length > 0) {
      throw new AppError("Không thể theo dõi người dùng này", 403, ErrorCode.USER_PROFILE_ACCESS_DENIED);
    }

    const [existingFollow] = await pool.query<FollowRow[]>(
      "SELECT id FROM followers WHERE follower_id = ? AND following_id = ?",
      [userId, targetUserId]
    );
    
    if (existingFollow.length > 0) {
      throw new AppError("Bạn đã theo dõi người dùng này rồi", 400, ErrorCode.DUPLICATE_ENTRY);
    }

    await pool.query(
      "INSERT INTO followers (follower_id, following_id) VALUES (?, ?)",
      [userId, targetUserId]
    );

    const allowFollowNotifs = userExists[0]?.allow_follow_notifications === 1;
    if (allowFollowNotifs) {
      await pool.query(
        "INSERT INTO notifications (user_id, type, related_id, message) VALUES (?, ?, ?, ?)",
        [
          targetUserId, 
          "follow", 
          userId, 
          "đã bắt đầu theo dõi bạn"
        ]
      );
    }

    res.status(200).json({
      status: "success",
      message: "Đã theo dõi người dùng thành công"
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Lỗi khi theo dõi người dùng", 500, ErrorCode.SERVER_ERROR);
  }
};

export const unfollowUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    const targetUserId = parseInt(req.params.userId);
    
    if (!targetUserId) {
      throw new AppError("ID người dùng không hợp lệ", 400, ErrorCode.VALIDATION_ERROR);
    }
    
    if (userId === targetUserId) {
      throw new AppError("Không thể tự bỏ theo dõi chính mình", 400, ErrorCode.INVALID_OPERATION);
    }

    const [existingFollow] = await pool.query<FollowRow[]>(
      "SELECT id FROM followers WHERE follower_id = ? AND following_id = ?",
      [userId, targetUserId]
    );
    
    if (existingFollow.length === 0) {
      throw new AppError("Bạn chưa theo dõi người dùng này", 400, ErrorCode.NOT_FOUND);
    }

    await pool.query(
      "DELETE FROM followers WHERE follower_id = ? AND following_id = ?",
      [userId, targetUserId]
    );

    res.status(200).json({
      status: "success",
      message: "Đã bỏ theo dõi người dùng thành công"
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Lỗi khi bỏ theo dõi người dùng", 500, ErrorCode.SERVER_ERROR);
  }
};

export const getFollowStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    const targetUserId = parseInt(req.params.userId);
    
    if (!targetUserId) {
      throw new AppError("ID người dùng không hợp lệ", 400, ErrorCode.VALIDATION_ERROR);
    }

    const [userExists] = await pool.query<UserRow[]>(
      "SELECT user_id FROM users WHERE user_id = ?",
      [targetUserId]
    );
    
    if (userExists.length === 0) {
      throw new AppError("Người dùng không tồn tại", 404, ErrorCode.USER_NOT_FOUND);
    }

    const [isFollowing] = await pool.query<FollowRow[]>(
      "SELECT id FROM followers WHERE follower_id = ? AND following_id = ?",
      [userId, targetUserId]
    );
    
    const [isFollowedBy] = await pool.query<FollowRow[]>(
      "SELECT id FROM followers WHERE follower_id = ? AND following_id = ?",
      [targetUserId, userId]
    );

    res.status(200).json({
      status: "success",
      data: {
        is_following: isFollowing.length > 0,
        is_followed_by: isFollowedBy.length > 0
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Lỗi khi kiểm tra trạng thái theo dõi", 500, ErrorCode.SERVER_ERROR);
  }
};

export const getSuggestedUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const [suggestedUsers] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT u.user_id, u.username, u.full_name, u.profile_picture, u.is_verified,
       (SELECT COUNT(*) FROM followers WHERE following_id = u.user_id) as follower_count
       FROM users u
       WHERE u.user_id != ?
       AND u.user_id NOT IN (SELECT following_id FROM followers WHERE follower_id = ?)
       AND u.user_id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = ?)
       AND u.user_id NOT IN (SELECT blocker_id FROM user_blocks WHERE blocked_id = ?)
       AND u.is_private = 0
       ORDER BY RAND(), follower_count DESC
       LIMIT ?`,
      [userId, userId, userId, userId, limit]
    );

    res.status(200).json({
      status: "success",
      data: suggestedUsers
    });
  } catch (error) {
    throw new AppError("Lỗi khi lấy đề xuất người dùng", 500, ErrorCode.SERVER_ERROR);
  }
};

export const getFollowCounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    const targetUserId = parseInt(req.params.userId) || userId;
    
    const [userExists] = await pool.query<UserRow[]>(
      "SELECT user_id FROM users WHERE user_id = ?",
      [targetUserId]
    );
    
    if (userExists.length === 0) {
      throw new AppError("Người dùng không tồn tại", 404, ErrorCode.USER_NOT_FOUND);
    }

    if (targetUserId !== userId) {
      const [privacyCheck] = await pool.query<UserRow[]>(
        `SELECT is_private FROM users WHERE user_id = ?`,
        [targetUserId]
      );
      
      const isPrivate = privacyCheck[0]?.is_private === 1;
      
      if (isPrivate) {
        const [followCheck] = await pool.query<FollowRow[]>(
          `SELECT id FROM followers WHERE follower_id = ? AND following_id = ?`,
          [userId, targetUserId]
        );
        
        if (followCheck.length === 0) {
          throw new AppError(
            "Không thể xem thông tin của tài khoản riêng tư", 
            403, 
            ErrorCode.USER_PROFILE_ACCESS_DENIED
          );
        }
      }
    }

    const [followersCount] = await pool.query<CountRow[]>(
      "SELECT COUNT(*) as followers_count FROM followers WHERE following_id = ?",
      [targetUserId]
    );
    
    const [followingCount] = await pool.query<CountRow[]>(
      "SELECT COUNT(*) as following_count FROM followers WHERE follower_id = ?",
      [targetUserId]
    );

    res.status(200).json({
      status: "success",
      data: {
        followers_count: followersCount[0].followers_count,
        following_count: followingCount[0].following_count
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Lỗi khi lấy số lượng theo dõi", 500, ErrorCode.SERVER_ERROR);
  }
};

