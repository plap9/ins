import { Request, Response, NextFunction } from "express";
import { AppError } from "../middlewares/errorHandler";
import { ErrorCode } from "../types/errorCode";
import { AuthRequest } from "../middlewares/authMiddleware";
import { invalidateUserProfileCache } from "../utils/cacheUtils";

// Xử lý xóa cache profile người dùng
export const invalidateUserCache = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    if (isNaN(userId)) {
      return next(new AppError("ID người dùng không hợp lệ", 400, ErrorCode.VALIDATION_ERROR));
    }
    
    await invalidateUserProfileCache(userId);
    console.log(`Đã xóa cache profile của user_id ${userId}`);
    
    res.status(200).json({
      success: true,
      message: "Đã xóa cache profile người dùng"
    });
  } catch (error) {
    next(error);
  }
}; 