import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../middlewares/errorHandler";
import { ErrorCode } from "../types/errorCode";
export interface AuthRequest extends Request {
    user?: { user_id: number };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) {
        return next(new AppError("Không có token, quyền truy cập bị từ chối", 401, ErrorCode.INVALID_TOKEN));
    }

    if (!process.env.JWT_SECRET) {
        return next(new AppError("Lỗi máy chủ: JWT_SECRET không được định nghĩa", 500));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number };
        console.log(" Decoded Token:", decoded);
        req.user = { user_id: decoded.userId };
        next();
    } catch (error) {
        return next(new AppError("Token không hợp lệ hoặc đã hết hạn", 401, ErrorCode.TOKEN_EXPIRED));
    }
};