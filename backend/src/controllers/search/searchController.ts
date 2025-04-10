import { Request, Response, NextFunction } from 'express';
import pool from '../../config/db';
import { AppException } from "../../middlewares/errorHandler";
import { ErrorCode } from '../../types/errorCode';
import { RowDataPacket } from 'mysql2';
import { AuthRequest } from '../../middlewares/authMiddleware';
import { cacheData, getCachedData } from '../../utils/cacheUtils';

export const searchUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { query } = req.query;
    const userId = req.user?.user_id;

    if (!query || typeof query !== "string" || query.trim() === "") {
      return next(new AppException("Truy vấn tìm kiếm không hợp lệ", ErrorCode.USER_SEARCH_INVALID, 400));
    }

    const rawQuery = query.toLowerCase().trim();
    const prefixTerm = `${rawQuery}%`;
    const substringTerm = `%${rawQuery}%`;

    const cacheKey = `search:users:${rawQuery}`;
    const cachedResults = await getCachedData(cacheKey);

    if (cachedResults) {
      console.log(`Cache hit for key: ${cacheKey}`);
      res.status(200).json({
        success: true,
        users: cachedResults,
        source: 'cache'
      });
      return;
    }

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
          (LOWER(username) LIKE ? OR LOWER(full_name) LIKE ?)
          AND status = 'active'
        ORDER BY
          CASE
            WHEN LOWER(username) = ? THEN 1
            WHEN LOWER(full_name) = ? THEN 2
            WHEN LOWER(username) LIKE ? THEN 3
            WHEN LOWER(username) LIKE ? THEN 4 
            WHEN LOWER(full_name) LIKE ? THEN 5
            WHEN LOWER(full_name) LIKE ? THEN 6
            ELSE 7
          END,
          LENGTH(username), 
          username
        LIMIT 30`,
      [
        substringTerm,
        substringTerm,
        rawQuery,
        rawQuery,
        prefixTerm,
        substringTerm,
        prefixTerm,
        substringTerm,
      ]
    );

    if (users.length > 0) {
        await cacheData(cacheKey, users, 60 * 15);
        console.log(`Cached results for key: ${cacheKey}`);
    } else {
        console.log(`No results found for key: ${cacheKey}, not caching.`);
    }

    if (userId) {
      try {
         const [existingHistory] = await pool.query<RowDataPacket[]>(
           `SELECT history_id FROM search_history
            WHERE user_id = ? AND search_text = ? AND type = 'user'`,
           [userId, rawQuery]
         );
         
         if (existingHistory.length > 0) {
           await pool.query(
             `UPDATE search_history SET created_at = NOW()
              WHERE history_id = ?`,
             [existingHistory[0].history_id]
           );
         } else {
           await pool.query(
             `INSERT INTO search_history
              (user_id, search_text, type)
             VALUES (?, ?, 'user')`,
             [userId, rawQuery]
           );
         }
      } catch (historyError) {
         console.error("Lỗi khi lưu lịch sử tìm kiếm:", historyError);
      }
    }

    res.status(200).json({
      success: true,
      users,
      source: users.length > 0 ? 'database' : 'no-results'
    });

  } catch (error) {
    console.error("Lỗi nghiêm trọng khi tìm kiếm người dùng:", error);
    if (error instanceof AppException) {
        next(error);
    } else if (typeof error === 'object' && error !== null && 'code' in error) {
         console.error(`Database Error Code: ${(error as any).code}`);
         next(new AppException("Lỗi cơ sở dữ liệu khi tìm kiếm người dùng", ErrorCode.DB_CONNECTION_ERROR, 500));
    } else {
        next(new AppException("Đã xảy ra lỗi không mong muốn khi tìm kiếm người dùng", ErrorCode.SERVER_ERROR, 500));
    }
  }
};

export const getSearchHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return next(new AppException("Chưa đăng nhập", ErrorCode.USER_NOT_AUTHENTICATED, 401));
    }

    const [searchHistory] = await pool.query<RowDataPacket[]>(
      `SELECT
          history_id as id,
          search_text as query,
          created_at as createdAt
        FROM search_history
        WHERE user_id = ? AND type = 'user'
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
    next(new AppException("Đã xảy ra lỗi khi lấy lịch sử tìm kiếm", ErrorCode.SERVER_ERROR, 500));
  }
};

export const deleteSearchHistoryItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.user_id;

    if (!userId) {
      return next(new AppException("Chưa đăng nhập", ErrorCode.USER_NOT_AUTHENTICATED, 401));
    }
    if (!id || !/^\d+$/.test(id)) {
         return next(new AppException("ID mục lịch sử không hợp lệ", ErrorCode.VALIDATION_ERROR, 400));
    }

    const [result] = await pool.query(
      `DELETE FROM search_history
       WHERE history_id = ? AND user_id = ? AND type = 'user'`,
      [id, userId]
    );

    if (typeof result === 'object' && result !== null && 'affectedRows' in result) {
         const affectedRows = (result as { affectedRows: number }).affectedRows;
         if (affectedRows === 0) {
             return next(new AppException("Không tìm thấy mục lịch sử hoặc không có quyền xóa", ErrorCode.NOT_FOUND, 404));
         }
    } else {
         console.error("Kết quả không mong đợi từ query DELETE:", result);
         return next(new AppException("Lỗi không xác định khi xóa lịch sử", ErrorCode.SERVER_ERROR, 500));
    }

    res.status(200).json({
      success: true,
      message: "Đã xóa mục lịch sử tìm kiếm"
    });
  } catch (error) {
    console.error("Lỗi khi xóa mục lịch sử tìm kiếm:", error);
     if (error instanceof AppException) {
         next(error);
     } else {
         next(new AppException("Đã xảy ra lỗi khi xóa mục lịch sử tìm kiếm", ErrorCode.SERVER_ERROR, 500));
     }
  }
};

export const clearSearchHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return next(new AppException("Chưa đăng nhập", ErrorCode.USER_NOT_AUTHENTICATED, 401));
    }

    await pool.query(
      `DELETE FROM search_history
       WHERE user_id = ? AND type = 'user'`,
      [userId]
    );

    res.status(200).json({
      success: true,
      message: "Đã xóa toàn bộ lịch sử tìm kiếm người dùng"
    });
  } catch (error) {
    console.error("Lỗi khi xóa lịch sử tìm kiếm:", error);
    next(new AppException("Đã xảy ra lỗi khi xóa lịch sử tìm kiếm", ErrorCode.SERVER_ERROR, 500));
  }
};