import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import connection from "../../config/db";
import { ErrorCode } from "../../types/errorCode";
import { cacheUtils } from "../../config/redis";
import { AppException } from "../../middlewares/errorHandler";
import { createController } from "../../utils/errorUtils";

const refreshTokenHandler = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        throw new AppException(
            "Thiếu refresh token",
            ErrorCode.MISSING_TOKEN,
            400
        );
    }

    if (!process.env.JWT_REFRESH_SECRET) {
        throw new AppException(
            "Lỗi cấu hình server",
            ErrorCode.SERVER_ERROR,
            500
        );
    }

    try {
        // Xác thực refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET) as { userId: number };
        const userId = decoded.userId;

        // Kiểm tra người dùng có tồn tại
        const [users] = await connection.query(
            "SELECT id, username, email FROM users WHERE id = ?",
            [userId]
        );

        if ((users as any[]).length === 0) {
            throw new AppException(
                "Người dùng không tồn tại",
                ErrorCode.ACCOUNT_NOT_FOUND,
                404
            );
        }

        // Tạo token mới
        const newToken = jwt.sign(
            { userId },
            process.env.JWT_SECRET || "default-secret",
            { expiresIn: "7d" }
        );

        // Tạo refresh token mới
        const newRefreshToken = jwt.sign(
            { userId },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: "30d" }
        );

        res.json({
            status: "success",
            data: {
                token: newToken,
                refreshToken: newRefreshToken,
                user: (users as any[])[0]
            }
        });
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new AppException(
                "Refresh token đã hết hạn",
                ErrorCode.TOKEN_EXPIRED,
                401
            );
        } else if (error instanceof jwt.JsonWebTokenError) {
            throw new AppException(
                "Refresh token không hợp lệ",
                ErrorCode.INVALID_TOKEN,
                401
            );
        }
        throw error;
    }
};

export const refreshToken = createController(refreshTokenHandler, 'Auth:RefreshToken');

const logoutHandler = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    const token = req.header("Authorization")?.split(" ")[1];

    if (!refreshToken) {
        throw new AppException(
            "Không có refresh token", 
            ErrorCode.MISSING_TOKEN, 
            400
        );
    }
    
    // Vô hiệu hóa refresh token trong cache
    await cacheUtils.invalidateRefreshToken(refreshToken);
    
    // Xóa refresh token từ cơ sở dữ liệu
    await connection.query("DELETE FROM refresh_tokens WHERE token = ?", [refreshToken]);
    
    // Thêm token hiện tại vào danh sách đen nếu có
    if (token) {
        try {
            const decoded = jwt.decode(token) as any;
            if (decoded && decoded.exp) {
                const timeToExpiry = decoded.exp - Math.floor(Date.now() / 1000);
                if (timeToExpiry > 0) {
                    await cacheUtils.blacklistToken(token, timeToExpiry);
                }
            }
        } catch (err) {
            // Lỗi khi giải mã token không quan trọng lắm
        }
    }

    res.json({ 
        status: "success",
        message: "Đăng xuất thành công" 
    });
};

export const logout = createController(logoutHandler, 'Auth:Logout');