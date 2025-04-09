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

    if (!query || typeof query !== "string" || query.trim() === "") {
      return next(new AppError("Truy vấn tìm kiếm không hợp lệ", 400, ErrorCode.USER_SEARCH_INVALID));
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
         await pool.query(
            `INSERT INTO search_history
              (user_id, search_text, type)
            VALUES (?, ?, 'user')
            ON DUPLICATE KEY UPDATE created_at = NOW()`,
            [userId, rawQuery]
          );
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
    if (error instanceof AppError) {
        next(error);
    } else if (typeof error === 'object' && error !== null && 'code' in error) {
         console.error(`Database Error Code: ${(error as any).code}`);
         next(new AppError("Lỗi cơ sở dữ liệu khi tìm kiếm người dùng", 500, ErrorCode.DB_CONNECTION_ERROR));
    } else {
        next(new AppError("Đã xảy ra lỗi không mong muốn khi tìm kiếm người dùng", 500, ErrorCode.SERVER_ERROR));
    }
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
    if (!id || !/^\d+$/.test(id)) {
         return next(new AppError("ID mục lịch sử không hợp lệ", 400, ErrorCode.VALIDATION_ERROR));
    }

    const [result] = await pool.query(
      `DELETE FROM search_history
       WHERE history_id = ? AND user_id = ? AND type = 'user'`,
      [id, userId]
    );

    if (typeof result === 'object' && result !== null && 'affectedRows' in result) {
         const affectedRows = (result as { affectedRows: number }).affectedRows;
         if (affectedRows === 0) {
             return next(new AppError("Không tìm thấy mục lịch sử hoặc không có quyền xóa", 404, ErrorCode.NOT_FOUND));
         }
    } else {
         console.error("Kết quả không mong đợi từ query DELETE:", result);
         return next(new AppError("Lỗi không xác định khi xóa lịch sử", 500, ErrorCode.SERVER_ERROR));
    }

    res.status(200).json({
      success: true,
      message: "Đã xóa mục lịch sử tìm kiếm"
    });
  } catch (error) {
    console.error("Lỗi khi xóa mục lịch sử tìm kiếm:", error);
     if (error instanceof AppError) {
         next(error);
     } else {
         next(new AppError("Đã xảy ra lỗi khi xóa mục lịch sử tìm kiếm", 500, ErrorCode.SERVER_ERROR));
     }
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
       WHERE user_id = ? AND type = 'user'`,
      [userId]
    );

    res.status(200).json({
      success: true,
      message: "Đã xóa toàn bộ lịch sử tìm kiếm người dùng"
    });
  } catch (error) {
    console.error("Lỗi khi xóa lịch sử tìm kiếm:", error);
    next(new AppError("Đã xảy ra lỗi khi xóa lịch sử tìm kiếm", 500, ErrorCode.SERVER_ERROR));
  }
};