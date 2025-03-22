import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import pool from "../../config/db";
import { AppError,ErrorCode } from "../../middlewares/errorHandler";
import { cacheUtils } from "../../config/redis";

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw new AppError("Thiếu token", 400, ErrorCode.MISSING_TOKEN);
        }

        const userId = await cacheUtils.getRefreshTokenUserId(refreshToken);
        if (!userId) {
            const [tokens]: any = await pool.query(
                "SELECT user_id FROM refresh_tokens WHERE token = ?",
                [refreshToken]
            );

            if (tokens.length === 0) {
                throw new AppError("Token không hợp lệ", 400, ErrorCode.INVALID_TOKEN);
            }

            await cacheUtils.storeRefreshToken(tokens[0].user_id, refreshToken);
        }

        jwt.verify(refreshToken, process.env.REFRESH_SECRET as string, async (error: any, decoded: any) => {
            if (error) {
                await cacheUtils.invalidateRefreshToken(refreshToken);
                await pool.query("DELETE FROM refresh_tokens WHERE token = ?", [refreshToken]);
                return next(new AppError("Token không hợp lệ", 400, ErrorCode.INVALID_VERIFICATION));
            }

            const newAccessToken = jwt.sign(
                { userId: decoded.userId }, 
                process.env.JWT_SECRET as string, 
                { expiresIn: "1h" }
            );

            res.json({ token: newAccessToken });
        });
    } catch (error) {
        next(error);
    }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { refreshToken } = req.body;
        const token = req.header("Authorization")?.split(" ")[1];

        if (!refreshToken) {
            throw new AppError("Không có refresh token", 400, ErrorCode.MISSING_TOKEN);
        }
        
        await cacheUtils.invalidateRefreshToken(refreshToken);
        
        await pool.query("DELETE FROM refresh_tokens WHERE token = ?", [refreshToken]);
        
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
            }
        }

        res.json({ message: "Đăng xuất thành công" });
    } catch (error) {
        next(error);
    }
}