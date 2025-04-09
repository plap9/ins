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

interface FollowRequestRow extends RowDataPacket {
  request_id: number;
  status?: string;
  created_at?: Date;
  requester_id: number;
}

interface FollowLimitRow extends RowDataPacket {
  count: number;
}

interface RateLimitRow extends RowDataPacket {
  count: number;
}

const FOLLOW_LIMIT = 7500; 
const FOLLOW_DAILY_LIMIT = 200; 
const FOLLOW_HOURLY_LIMIT = 60; 
const UNFOLLOW_DAILY_LIMIT = 100; 

export const getFollowing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppError("Không xác định được người dùng", 401, ErrorCode.USER_NOT_AUTHENTICATED);
    }
    
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
    
    if (!userId) {
      throw new AppError("Không xác định được người dùng", 401, ErrorCode.USER_NOT_AUTHENTICATED);
    }
    
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
    
    if (!userId) {
      throw new AppError("Không xác định được người dùng", 401, ErrorCode.USER_NOT_AUTHENTICATED);
    }
    
    const targetUserId = parseInt(req.params.userId);
    
    if (!targetUserId) {
      throw new AppError("ID người dùng không hợp lệ", 400, ErrorCode.VALIDATION_ERROR);
    }
    
    if (userId === targetUserId) {
      throw new AppError("Không thể tự theo dõi chính mình", 400, ErrorCode.INVALID_OPERATION);
    }

    await checkFollowLimits(userId);

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
    
    const [existingRequest] = await pool.query<FollowRequestRow[]>(
      "SELECT request_id, status FROM follow_requests WHERE requester_id = ? AND target_id = ?",
      [userId, targetUserId]
    );
    
    if (existingRequest.length > 0) {
      if (existingRequest[0].status === 'pending') {
        throw new AppError("Bạn đã gửi yêu cầu theo dõi tới người dùng này", 400, ErrorCode.DUPLICATE_ENTRY);
      } else if (existingRequest[0].status === 'rejected') {
        await pool.query(
          "UPDATE follow_requests SET status = 'pending', created_at = NOW() WHERE request_id = ?",
          [existingRequest[0].request_id]
        );
        
        res.status(200).json({
          status: "success",
          message: "Đã gửi lại yêu cầu theo dõi"
        });
        return;
      }
    }

    const isPrivate = userExists[0].is_private === 1;
    const allowFollowRequests = userExists[0].allow_follow_requests === 1;
    
    if (isPrivate && allowFollowRequests) {
      await pool.query(
        "INSERT INTO follow_requests (requester_id, target_id, status) VALUES (?, ?, 'pending')",
        [userId, targetUserId]
      );
      
      await pool.query(
        "INSERT INTO notifications (user_id, type, related_id, message) VALUES (?, ?, ?, ?)",
        [
          targetUserId, 
          "follow_request", 
          userId, 
          "đã gửi yêu cầu theo dõi bạn"
        ]
      );
      
      res.status(200).json({
        status: "success",
        message: "Đã gửi yêu cầu theo dõi"
      });
    } 
    else if (isPrivate && !allowFollowRequests) {
      throw new AppError("Người dùng này không chấp nhận yêu cầu theo dõi", 403, ErrorCode.USER_PROFILE_ACCESS_DENIED);
    }
    else {
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
      
      await pool.query(
        "INSERT INTO follow_history (user_id, followed_id, action_type) VALUES (?, ?, 'follow')",
        [userId, targetUserId]
      );

      res.status(200).json({
        status: "success",
        message: "Đã theo dõi người dùng thành công"
      });
    }
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
    
    if (!userId) {
      throw new AppError("Không xác định được người dùng", 401, ErrorCode.USER_NOT_AUTHENTICATED);
    }
    
    const targetUserId = parseInt(req.params.userId);
    
    if (!targetUserId) {
      throw new AppError("ID người dùng không hợp lệ", 400, ErrorCode.VALIDATION_ERROR);
    }
    
    if (userId === targetUserId) {
      throw new AppError("Không thể tự bỏ theo dõi chính mình", 400, ErrorCode.INVALID_OPERATION);
    }

    const [unfollowCount] = await pool.query<RateLimitRow[]>(
      "SELECT COUNT(*) as count FROM follow_history WHERE user_id = ? AND action_type = 'unfollow' AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)",
      [userId]
    );
    
    if (unfollowCount[0].count >= UNFOLLOW_DAILY_LIMIT) {
      throw new AppError(
        `Bạn đã đạt giới hạn bỏ theo dõi hôm nay (${UNFOLLOW_DAILY_LIMIT} người/ngày)`, 
        429, 
        ErrorCode.RATE_LIMIT_EXCEEDED
      );
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
    
    await pool.query(
      "INSERT INTO follow_history (user_id, followed_id, action_type) VALUES (?, ?, 'unfollow')",
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
    
    if (!userId) {
      throw new AppError("Không xác định được người dùng", 401, ErrorCode.USER_NOT_AUTHENTICATED);
    }
    
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
    
    const [pendingRequest] = await pool.query<FollowRequestRow[]>(
      "SELECT request_id FROM follow_requests WHERE requester_id = ? AND target_id = ? AND status = 'pending'",
      [userId, targetUserId]
    );

    res.status(200).json({
      status: "success",
      data: {
        is_following: isFollowing.length > 0,
        is_followed_by: isFollowedBy.length > 0,
        has_pending_request: pendingRequest.length > 0
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
    
    if (!userId) {
      throw new AppError("Không xác định được người dùng", 401, ErrorCode.USER_NOT_AUTHENTICATED);
    }
    
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
    
    if (!userId) {
      throw new AppError("Không xác định được người dùng", 401, ErrorCode.USER_NOT_AUTHENTICATED);
    }
    
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

export const getFollowRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppError("Không xác định được người dùng", 401, ErrorCode.USER_NOT_AUTHENTICATED);
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    const [requests] = await pool.query<RowDataPacket[]>(
      `SELECT fr.request_id, fr.created_at, 
       u.user_id, u.username, u.full_name, u.profile_picture, u.is_verified
       FROM follow_requests fr
       JOIN users u ON fr.requester_id = u.user_id
       WHERE fr.target_id = ? AND fr.status = 'pending'
       ORDER BY fr.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    
    const [totalCount] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM follow_requests WHERE target_id = ? AND status = 'pending'",
      [userId]
    );

    res.status(200).json({
      status: "success",
      data: requests,
      pagination: {
        total: totalCount[0].total,
        page,
        limit,
        pages: Math.ceil(totalCount[0].total / limit)
      }
    });
  } catch (error) {
    throw new AppError("Lỗi khi lấy danh sách yêu cầu theo dõi", 500, ErrorCode.SERVER_ERROR);
  }
};

export const acceptFollowRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppError("Không xác định được người dùng", 401, ErrorCode.USER_NOT_AUTHENTICATED);
    }
    
    const requestId = parseInt(req.params.requestId);
    
    if (!requestId) {
      throw new AppError("ID yêu cầu không hợp lệ", 400, ErrorCode.VALIDATION_ERROR);
    }
    
    interface RequestDataRow extends RowDataPacket {
      requester_id: number;
    }
    
    const [requestData] = await pool.query<RequestDataRow[]>(
      "SELECT requester_id FROM follow_requests WHERE request_id = ? AND target_id = ? AND status = 'pending'",
      [requestId, userId]
    );
    
    if (requestData.length === 0) {
      throw new AppError("Yêu cầu theo dõi không tồn tại hoặc đã được xử lý", 404, ErrorCode.NOT_FOUND);
    }
    
    const requesterId = requestData[0].requester_id;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      await connection.query(
        "UPDATE follow_requests SET status = 'accepted' WHERE request_id = ?",
        [requestId]
      );
      
      await connection.query(
        "INSERT INTO followers (follower_id, following_id) VALUES (?, ?)",
        [requesterId, userId]
      );
      
      await connection.query(
        "INSERT INTO notifications (user_id, type, related_id, message) VALUES (?, ?, ?, ?)",
        [
          requesterId, 
          "follow_request_accepted", 
          userId, 
          "đã chấp nhận yêu cầu theo dõi của bạn"
        ]
      );
      
      await connection.query(
        "INSERT INTO follow_history (user_id, followed_id, action_type) VALUES (?, ?, 'follow')",
        [requesterId, userId]
      );
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.status(200).json({
      status: "success",
      message: "Đã chấp nhận yêu cầu theo dõi"
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Lỗi khi chấp nhận yêu cầu theo dõi", 500, ErrorCode.SERVER_ERROR);
  }
};

export const rejectFollowRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppError("Không xác định được người dùng", 401, ErrorCode.USER_NOT_AUTHENTICATED);
    }
    
    const requestId = parseInt(req.params.requestId);
    
    if (!requestId) {
      throw new AppError("ID yêu cầu không hợp lệ", 400, ErrorCode.VALIDATION_ERROR);
    }
    
    const [request] = await pool.query<FollowRequestRow[]>(
      "SELECT * FROM follow_requests WHERE request_id = ? AND target_id = ? AND status = 'pending'",
      [requestId, userId]
    );
    
    if (request.length === 0) {
      throw new AppError("Yêu cầu theo dõi không tồn tại hoặc đã được xử lý", 404, ErrorCode.NOT_FOUND);
    }

    await pool.query(
      "UPDATE follow_requests SET status = 'rejected' WHERE request_id = ?",
      [requestId]
    );

    res.status(200).json({
      status: "success",
      message: "Đã từ chối yêu cầu theo dõi"
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Lỗi khi từ chối yêu cầu theo dõi", 500, ErrorCode.SERVER_ERROR);
  }
};

export const cancelFollowRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppError("Không xác định được người dùng", 401, ErrorCode.USER_NOT_AUTHENTICATED);
    }
    
    const targetUserId = parseInt(req.params.userId);
    
    if (!targetUserId) {
      throw new AppError("ID người dùng không hợp lệ", 400, ErrorCode.VALIDATION_ERROR);
    }
    
    const [request] = await pool.query<FollowRequestRow[]>(
      "SELECT * FROM follow_requests WHERE requester_id = ? AND target_id = ? AND status = 'pending'",
      [userId, targetUserId]
    );
    
    if (request.length === 0) {
      throw new AppError("Bạn chưa gửi yêu cầu theo dõi tới người dùng này", 404, ErrorCode.NOT_FOUND);
    }

    await pool.query(
      "DELETE FROM follow_requests WHERE requester_id = ? AND target_id = ?",
      [userId, targetUserId]
    );
    
    await pool.query(
      "DELETE FROM notifications WHERE user_id = ? AND related_id = ? AND type = 'follow_request'",
      [targetUserId, userId]
    );

    res.status(200).json({
      status: "success",
      message: "Đã hủy yêu cầu theo dõi"
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Lỗi khi hủy yêu cầu theo dõi", 500, ErrorCode.SERVER_ERROR);
  }
};

export const bulkProcessFollowRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppError("Không xác định được người dùng", 401, ErrorCode.USER_NOT_AUTHENTICATED);
    }
    
    const { requestIds, action } = req.body;
    
    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      throw new AppError("Danh sách ID yêu cầu không hợp lệ", 400, ErrorCode.VALIDATION_ERROR);
    }
    
    if (action !== 'accept' && action !== 'reject') {
      throw new AppError("Hành động không hợp lệ", 400, ErrorCode.VALIDATION_ERROR);
    }
    
    interface BulkRequestRow extends RowDataPacket {
      request_id: number;
      requester_id: number;
    }
    
    const placeholders = requestIds.map(() => '?').join(',');
    const [validRequests] = await pool.query<BulkRequestRow[]>(
      `SELECT fr.request_id, u.user_id as requester_id FROM follow_requests fr 
       JOIN users u ON fr.requester_id = u.user_id 
       WHERE fr.request_id IN (${placeholders}) AND fr.target_id = ? AND fr.status = 'pending'`,
      [...requestIds, userId]
    );
    
    if (validRequests.length === 0) {
      throw new AppError("Không tìm thấy yêu cầu theo dõi hợp lệ", 404, ErrorCode.NOT_FOUND);
    }
    
    const validRequestIds = validRequests.map(req => req.request_id);
    const validRequestPlaceholders = validRequestIds.map(() => '?').join(',');

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      if (action === 'accept') {
        await connection.query(
          `UPDATE follow_requests SET status = 'accepted' WHERE request_id IN (${validRequestPlaceholders})`,
          [...validRequestIds]
        );
        
        const followValues = validRequests.map(req => [req.requester_id, userId]);
        const followPlaceholders = followValues.map(() => '(?, ?)').join(',');
        await connection.query(
          `INSERT INTO followers (follower_id, following_id) VALUES ${followPlaceholders}`,
          followValues.flat()
        );
        
        const notificationValues = validRequests.map(req => [
          req.requester_id, 
          'follow_request_accepted', 
          userId, 
          'đã chấp nhận yêu cầu theo dõi của bạn'
        ]);
        const notificationPlaceholders = notificationValues.map(() => '(?, ?, ?, ?)').join(',');
        await connection.query(
          `INSERT INTO notifications (user_id, type, related_id, message) VALUES ${notificationPlaceholders}`,
          notificationValues.flat()
        );
        
        const historyValues = validRequests.map(req => [req.requester_id, userId, 'follow']);
        const historyPlaceholders = historyValues.map(() => '(?, ?, ?)').join(',');
        await connection.query(
          `INSERT INTO follow_history (user_id, followed_id, action_type) VALUES ${historyPlaceholders}`,
          historyValues.flat()
        );
      } else {
        await connection.query(
          `UPDATE follow_requests SET status = 'rejected' WHERE request_id IN (${validRequestPlaceholders})`,
          [...validRequestIds]
        );
      }
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.status(200).json({
      status: "success",
      message: action === 'accept' ? "Đã chấp nhận các yêu cầu theo dõi" : "Đã từ chối các yêu cầu theo dõi",
      processed: validRequestIds.length,
      total: requestIds.length
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Lỗi khi xử lý hàng loạt yêu cầu theo dõi", 500, ErrorCode.SERVER_ERROR);
  }
};

async function checkFollowLimits(userId: number): Promise<void> {
  const [followingCount] = await pool.query<FollowLimitRow[]>(
    "SELECT COUNT(*) as count FROM followers WHERE follower_id = ?",
    [userId]
  );
  
  if (followingCount[0].count >= FOLLOW_LIMIT) {
    throw new AppError(
      `Bạn đã đạt giới hạn số lượng người có thể theo dõi (${FOLLOW_LIMIT})`, 
      429, 
      ErrorCode.RATE_LIMIT_EXCEEDED
    );
  }
  
  const [dailyFollowCount] = await pool.query<RateLimitRow[]>(
    "SELECT COUNT(*) as count FROM follow_history WHERE user_id = ? AND action_type = 'follow' AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)",
    [userId]
  );
  
  if (dailyFollowCount[0].count >= FOLLOW_DAILY_LIMIT) {
    throw new AppError(
      `Bạn đã đạt giới hạn theo dõi hàng ngày (${FOLLOW_DAILY_LIMIT} người/ngày)`, 
      429, 
      ErrorCode.RATE_LIMIT_EXCEEDED
    );
  }
  
  const [hourlyFollowCount] = await pool.query<RateLimitRow[]>(
    "SELECT COUNT(*) as count FROM follow_history WHERE user_id = ? AND action_type = 'follow' AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)",
    [userId]
  );
  
  if (hourlyFollowCount[0].count >= FOLLOW_HOURLY_LIMIT) {
    throw new AppError(
      `Bạn đã đạt giới hạn theo dõi hàng giờ (${FOLLOW_HOURLY_LIMIT} người/giờ)`, 
      429, 
      ErrorCode.RATE_LIMIT_EXCEEDED
    );
  }
}

