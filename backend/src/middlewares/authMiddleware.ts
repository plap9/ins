import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppException } from "../middlewares/errorHandler";
import { ErrorCode } from "../types/errorCode";
import { logError } from "../utils/errorUtils";

export interface AuthRequest extends Request {
    user?: { user_id: number };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) {
        return next(new AppException(
            "Không có token, quyền truy cập bị từ chối", 
            ErrorCode.MISSING_TOKEN, 
            401
        ));
    }
    
    if (!process.env.JWT_SECRET) {
        logError('Auth', new Error('JWT_SECRET không được định nghĩa'), 'Lỗi cấu hình máy chủ');
        return next(new AppException(
            "Lỗi máy chủ: JWT_SECRET không được định nghĩa", 
            ErrorCode.SERVER_ERROR, 
            500
        ));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number };
        req.user = { user_id: decoded.userId };
        next();
    } catch (error: any) {
        let errCode = ErrorCode.INVALID_TOKEN;
        let message = 'Token không hợp lệ hoặc đã hết hạn';
        let status = 401;
        
        if (error.name === 'TokenExpiredError') {
            errCode = ErrorCode.TOKEN_EXPIRED;
            message = 'Token đã hết hạn';
        } else if (error.name === 'JsonWebTokenError') {
            errCode = ErrorCode.INVALID_TOKEN;
            message = 'Token không hợp lệ';
        }
        
        logError('Auth', error, `Lỗi xác thực token: ${error.message}`);
        return next(new AppException(message, errCode, status));
    }
};