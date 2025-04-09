import { Request, Response, NextFunction } from 'express';
import pool from '../../config/db';
import { AppError } from '../../middlewares/errorHandler';
import { ErrorCode } from '../../types/errorCode';
import { RowDataPacket } from 'mysql2';
import { AuthRequest } from '../../middlewares/authMiddleware';
import { cacheData, getCachedData } from '../../utils/cacheUtils';

export const searchUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { query } = req.query;
    const userId = req.user?.user_id;

    if (!query || typeof query !== "string") {
      return next(new AppError("Truy vấn tìm kiếm không hợp lệ", 400, ErrorCode.USER_SEARCH_INVALID));
    }

    const cacheKey = `search:users:${query.toLowerCase()}`;
    const cachedResults = await getCachedData(cacheKey);
    
    if (cachedResults) {
      res.status(200).json({ 
        success: true, 
        users: cachedResults,
        source: 'cache'
      });
      return;
    }

    const searchTerm = `%${query}%`;
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT
        user_id as id,
        username,
        full_name as fullName,
        profile_picture as avatar,
        is_verified as isVerified,
        bio
      FROM users
      WHERE 
        (username LIKE ? OR full_name LIKE ?)
        AND status = 'active'
      ORDER BY 
        CASE 
          WHEN username LIKE ? THEN 1
          WHEN full_name LIKE ? THEN 2
          ELSE 3
        END,
        username
      LIMIT 20`,
      [searchTerm, searchTerm, searchTerm, searchTerm]
    );

    await cacheData(cacheKey, users, 60 * 15);

    if (userId && query.trim() !== "") {
      await pool.query(
        `INSERT INTO search_history 
          (user_id, search_text, type) 
        VALUES (?, ?, 'user')
        ON DUPLICATE KEY UPDATE created_at = NOW()`,
        [userId, query.toLowerCase().trim()]
      );
    }

    res.status(200).json({
      success: true,
      users,
      source: 'database'
    });
  } catch (error) {
    console.error("Lỗi khi tìm kiếm:", error);
    next(new AppError("Đã xảy ra lỗi khi tìm kiếm người dùng", 500, ErrorCode.SERVER_ERROR));
  }
};

export const getSearchHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return next(new AppError("Chưa đăng nhập", 401, ErrorCode.USER_NOT_AUTHENTICATED));
    }

    const [searchHistory] = await pool.query<RowDataPacket[]>(
      `SELECT 
        history_id as id,
        search_text as query,
        created_at as createdAt
      FROM search_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20`,
      [userId]
    );

    res.status(200).json({
      success: true,
      searchHistory
    });
  } catch (error) {
    console.error("Lỗi khi lấy lịch sử tìm kiếm:", error);
    next(new AppError("Đã xảy ra lỗi khi lấy lịch sử tìm kiếm", 500, ErrorCode.SERVER_ERROR));
  }
};

export const deleteSearchHistoryItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.user_id;

    if (!userId) {
      return next(new AppError("Chưa đăng nhập", 401, ErrorCode.USER_NOT_AUTHENTICATED));
    }

    const [result] = await pool.query(
      `DELETE FROM search_history
      WHERE history_id = ? AND user_id = ?`,
      [id, userId]
    );

    if ((result as any).affectedRows === 0) {
      return next(new AppError("Không tìm thấy mục lịch sử hoặc không có quyền xóa", 404, ErrorCode.NOT_FOUND));
    }

    res.status(200).json({ 
      success: true,
      message: "Đã xóa mục lịch sử tìm kiếm" 
    });
  } catch (error) {
    console.error("Lỗi khi xóa mục lịch sử tìm kiếm:", error);
    next(new AppError("Đã xảy ra lỗi khi xóa mục lịch sử tìm kiếm", 500, ErrorCode.SERVER_ERROR));
  }
};

export const clearSearchHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return next(new AppError("Chưa đăng nhập", 401, ErrorCode.USER_NOT_AUTHENTICATED));
    }

    await pool.query(
      `DELETE FROM search_history
      WHERE user_id = ?`,
      [userId]
    );

    res.status(200).json({ 
      success: true,
      message: "Đã xóa toàn bộ lịch sử tìm kiếm" 
    });
  } catch (error) {
    console.error("Lỗi khi xóa lịch sử tìm kiếm:", error);
    next(new AppError("Đã xảy ra lỗi khi xóa lịch sử tìm kiếm", 500, ErrorCode.SERVER_ERROR));
  }
}; 