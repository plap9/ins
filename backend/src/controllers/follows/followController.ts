import { Request, Response, NextFunction } from "express";
import pool from "../../config/db";
import { AuthRequest } from "../../middlewares/authMiddleware"; 
import { AppException } from "../../middlewares/errorHandler";
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

export const getFollowing = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const page = Math.max(parseInt(req.query.page as string || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string || '20', 10), 5), 50);
    const loggedInUserId = req.user?.user_id;

    if (!loggedInUserId) {
      return next(new AppException("Người dùng chưa được xác thực", ErrorCode.USER_NOT_AUTHENTICATED, 401));
    }

    if (isNaN(userId)) {
      return next(new AppException("ID người dùng không hợp lệ", ErrorCode.VALIDATION_ERROR, 400));
    }

    const offset = (page - 1) * limit;

    // Lấy danh sách following
    const [following] = await pool.query<RowDataPacket[]>(`
      SELECT 
        f.following_id as user_id,
        u.username,
        u.full_name,
        u.profile_picture,
        u.bio,
        CASE WHEN f2.follower_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_following,
        CASE WHEN f.following_id = ? THEN TRUE ELSE FALSE END AS is_self
      FROM followers f
      INNER JOIN users u ON f.following_id = u.user_id
      LEFT JOIN followers f2 ON f2.follower_id = ? AND f2.following_id = f.following_id
      WHERE f.follower_id = ?
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `, [loggedInUserId, loggedInUserId, userId, limit, offset]);

    // Đếm tổng số following
    const [[totalRow]] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM followers WHERE follower_id = ?",
      [userId]
    );

    const total = totalRow?.total || 0;

    res.status(200).json({
      success: true,
      following: following.map(user => ({
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        profile_picture: user.profile_picture,
        bio: user.bio,
        is_following: !!user.is_following,
        is_self: !!user.is_self
      })),
      pagination: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getFollowers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const page = Math.max(parseInt(req.query.page as string || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string || '20', 10), 5), 50);
    const loggedInUserId = req.user?.user_id;

    if (!loggedInUserId) {
      return next(new AppException("Người dùng chưa được xác thực", ErrorCode.USER_NOT_AUTHENTICATED, 401));
    }

    if (isNaN(userId)) {
      return next(new AppException("ID người dùng không hợp lệ", ErrorCode.VALIDATION_ERROR, 400));
    }

    const offset = (page - 1) * limit;

    // Lấy danh sách followers
    const [followers] = await pool.query<RowDataPacket[]>(`
      SELECT 
        f.follower_id as user_id,
        u.username,
        u.full_name,
        u.profile_picture,
        u.bio,
        CASE WHEN f2.follower_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_following,
        CASE WHEN f.follower_id = ? THEN TRUE ELSE FALSE END AS is_self
      FROM followers f
      INNER JOIN users u ON f.follower_id = u.user_id
      LEFT JOIN followers f2 ON f2.follower_id = ? AND f2.following_id = f.follower_id
      WHERE f.following_id = ?
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `, [loggedInUserId, loggedInUserId, userId, limit, offset]);

    // Đếm tổng số followers
    const [[totalRow]] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM followers WHERE following_id = ?",
      [userId]
    );

    const total = totalRow?.total || 0;

    res.status(200).json({
      success: true,
      followers: followers.map(follower => ({
        user_id: follower.user_id,
        username: follower.username,
        full_name: follower.full_name,
        profile_picture: follower.profile_picture,
        bio: follower.bio,
        is_following: !!follower.is_following,
        is_self: !!follower.is_self
      })),
      pagination: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const followUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const followerId = req.user?.user_id;
    const followingId = parseInt(req.params.userId, 10);

    if (!followerId) {
      return next(new AppException("Người dùng chưa được xác thực", ErrorCode.USER_NOT_AUTHENTICATED, 401));
    }

    if (isNaN(followingId)) {
      return next(new AppException("ID người dùng không hợp lệ", ErrorCode.VALIDATION_ERROR, 400));
    }

    if (followerId === followingId) {
      return next(new AppException("Không thể follow chính mình", ErrorCode.VALIDATION_ERROR, 400));
    }

    // Kiểm tra user tồn tại
    const [[targetUser]] = await connection.query<RowDataPacket[]>(
      "SELECT user_id, username FROM users WHERE user_id = ?",
      [followingId]
    );

    if (!targetUser) {
      return next(new AppException("Người dùng không tồn tại", ErrorCode.NOT_FOUND, 404));
    }

    // Kiểm tra đã follow chưa
    const [[existingFollow]] = await connection.query<RowDataPacket[]>(
      "SELECT id FROM followers WHERE follower_id = ? AND following_id = ?",
      [followerId, followingId]
    );

    if (existingFollow) {
      return next(new AppException("Đã follow người dùng này", ErrorCode.VALIDATION_ERROR, 400));
    }

    // Thêm follow relationship
    await connection.query(
      "INSERT INTO followers (follower_id, following_id) VALUES (?, ?)",
      [followerId, followingId]
    );

    // Cập nhật follow counts (nếu có columns này trong users table)
    await connection.query(
      "UPDATE users SET following_count = following_count + 1 WHERE user_id = ?",
      [followerId]
    );

    await connection.query(
      "UPDATE users SET followers_count = followers_count + 1 WHERE user_id = ?",
      [followingId]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: `Đã follow ${targetUser.username}`,
      following: {
        user_id: followingId,
        username: targetUser.username,
        is_following: true
      }
    });

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

export const unfollowUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const followerId = req.user?.user_id;
    const followingId = parseInt(req.params.userId, 10);

    if (!followerId) {
      return next(new AppException("Người dùng chưa được xác thực", ErrorCode.USER_NOT_AUTHENTICATED, 401));
    }

    if (isNaN(followingId)) {
      return next(new AppException("ID người dùng không hợp lệ", ErrorCode.VALIDATION_ERROR, 400));
    }

    // Kiểm tra follow relationship tồn tại
    const [[existingFollow]] = await connection.query<RowDataPacket[]>(
      "SELECT id FROM followers WHERE follower_id = ? AND following_id = ?",
      [followerId, followingId]
    );

    if (!existingFollow) {
      return next(new AppException("Chưa follow người dùng này", ErrorCode.VALIDATION_ERROR, 400));
    }

    // Xóa follow relationship
    const [deleteResult] = await connection.query<ResultSetHeader>(
      "DELETE FROM followers WHERE follower_id = ? AND following_id = ?",
      [followerId, followingId]
    );

    if (deleteResult.affectedRows === 0) {
      return next(new AppException("Lỗi khi unfollow", ErrorCode.SERVER_ERROR, 500));
    }

    // Cập nhật follow counts
    await connection.query(
      "UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE user_id = ?",
      [followerId]
    );

    await connection.query(
      "UPDATE users SET followers_count = GREATEST(0, followers_count - 1) WHERE user_id = ?",
      [followingId]
    );

    await connection.commit();

    const [[targetUser]] = await connection.query<RowDataPacket[]>(
      "SELECT username FROM users WHERE user_id = ?",
      [followingId]
    );

    res.status(200).json({
      success: true,
      message: `Đã unfollow ${targetUser?.username || 'người dùng'}`,
      following: {
        user_id: followingId,
        username: targetUser?.username,
        is_following: false
      }
    });

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

export const checkFollowStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const targetUserId = parseInt(req.params.userId);
    
    if (!targetUserId) {
      throw new AppException("ID người dùng không hợp lệ", ErrorCode.VALIDATION_ERROR, 400);
    }

    const [userExists] = await pool.query<UserRow[]>(
      "SELECT user_id FROM users WHERE user_id = ?",
      [targetUserId]
    );
    
    if (userExists.length === 0) {
      throw new AppException("Người dùng không tồn tại", ErrorCode.USER_NOT_FOUND, 404);
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
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi kiểm tra trạng thái theo dõi", ErrorCode.SERVER_ERROR, 500);
  }
};

export const getSuggestedUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
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
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi lấy đề xuất người dùng", ErrorCode.SERVER_ERROR, 500);
  }
};

export const getFollowCounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const targetUserId = parseInt(req.params.userId) || userId;
    
    const [userExists] = await pool.query<UserRow[]>(
      "SELECT user_id FROM users WHERE user_id = ?",
      [targetUserId]
    );
    
    if (userExists.length === 0) {
      throw new AppException("Người dùng không tồn tại", ErrorCode.USER_NOT_FOUND, 404);
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
          throw new AppException(
            "Không thể xem thông tin của tài khoản riêng tư", ErrorCode.USER_PROFILE_ACCESS_DENIED
          , 403);
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
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi lấy số lượng theo dõi", ErrorCode.SERVER_ERROR, 500);
  }
};

export const getFollowRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
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
    throw new AppException("Lỗi khi lấy danh sách yêu cầu theo dõi", ErrorCode.SERVER_ERROR, 500);
  }
};

export const acceptFollowRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const requestId = parseInt(req.params.requestId);
    
    if (!requestId) {
      throw new AppException("ID yêu cầu không hợp lệ", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    interface RequestDataRow extends RowDataPacket {
      requester_id: number;
    }
    
    const [requestData] = await pool.query<RequestDataRow[]>(
      "SELECT requester_id FROM follow_requests WHERE request_id = ? AND target_id = ? AND status = 'pending'",
      [requestId, userId]
    );
    
    if (requestData.length === 0) {
      throw new AppException("Yêu cầu theo dõi không tồn tại hoặc đã được xử lý", ErrorCode.NOT_FOUND, 404);
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
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi chấp nhận yêu cầu theo dõi", ErrorCode.SERVER_ERROR, 500);
  }
};

export const rejectFollowRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const requestId = parseInt(req.params.requestId);
    
    if (!requestId) {
      throw new AppException("ID yêu cầu không hợp lệ", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const [request] = await pool.query<FollowRequestRow[]>(
      "SELECT * FROM follow_requests WHERE request_id = ? AND target_id = ? AND status = 'pending'",
      [requestId, userId]
    );
    
    if (request.length === 0) {
      throw new AppException("Yêu cầu theo dõi không tồn tại hoặc đã được xử lý", ErrorCode.NOT_FOUND, 404);
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
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi từ chối yêu cầu theo dõi", ErrorCode.SERVER_ERROR, 500);
  }
};

export const cancelFollowRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const targetUserId = parseInt(req.params.userId);
    
    if (!targetUserId) {
      throw new AppException("ID người dùng không hợp lệ", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    const [request] = await pool.query<FollowRequestRow[]>(
      "SELECT * FROM follow_requests WHERE requester_id = ? AND target_id = ? AND status = 'pending'",
      [userId, targetUserId]
    );
    
    if (request.length === 0) {
      throw new AppException("Bạn chưa gửi yêu cầu theo dõi tới người dùng này", ErrorCode.NOT_FOUND, 404);
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
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi hủy yêu cầu theo dõi", ErrorCode.SERVER_ERROR, 500);
  }
};

export const bulkProcessFollowRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      throw new AppException("Không xác định được người dùng", ErrorCode.USER_NOT_AUTHENTICATED, 401);
    }
    
    const { requestIds, action } = req.body;
    
    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      throw new AppException("Danh sách ID yêu cầu không hợp lệ", ErrorCode.VALIDATION_ERROR, 400);
    }
    
    if (action !== 'accept' && action !== 'reject') {
      throw new AppException("Hành động không hợp lệ", ErrorCode.VALIDATION_ERROR, 400);
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
      throw new AppException("Không tìm thấy yêu cầu theo dõi hợp lệ", ErrorCode.NOT_FOUND, 404);
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
    if (error instanceof AppException) {
      throw error;
    }
    throw new AppException("Lỗi khi xử lý hàng loạt yêu cầu theo dõi", ErrorCode.SERVER_ERROR, 500);
  }
};

async function checkFollowLimits(userId: number): Promise<void> {
  const [followingCount] = await pool.query<FollowLimitRow[]>(
    "SELECT COUNT(*) as count FROM followers WHERE follower_id = ?",
    [userId]
  );
  
  if (followingCount[0].count >= FOLLOW_LIMIT) {
    throw new AppException(
      `Bạn đã đạt giới hạn số lượng người có thể theo dõi (${FOLLOW_LIMIT})`, ErrorCode.RATE_LIMIT_EXCEEDED
    , 429);
  }
  
  const [dailyFollowCount] = await pool.query<RateLimitRow[]>(
    "SELECT COUNT(*) as count FROM follow_history WHERE user_id = ? AND action_type = 'follow' AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)",
    [userId]
  );
  
  if (dailyFollowCount[0].count >= FOLLOW_DAILY_LIMIT) {
    throw new AppException(
      `Bạn đã đạt giới hạn theo dõi hàng ngày (${FOLLOW_DAILY_LIMIT} người/ngày)`, ErrorCode.RATE_LIMIT_EXCEEDED
    , 429);
  }
  
  const [hourlyFollowCount] = await pool.query<RateLimitRow[]>(
    "SELECT COUNT(*) as count FROM follow_history WHERE user_id = ? AND action_type = 'follow' AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)",
    [userId]
  );
  
  if (hourlyFollowCount[0].count >= FOLLOW_HOURLY_LIMIT) {
    throw new AppException(
      `Bạn đã đạt giới hạn theo dõi hàng giờ (${FOLLOW_HOURLY_LIMIT} người/giờ)`, ErrorCode.RATE_LIMIT_EXCEEDED
    , 429);
  }
}

