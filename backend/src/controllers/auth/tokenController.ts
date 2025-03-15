import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import pool from "../../config/db";
import { AppError } from "../../middlewares/errorHandler";

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw new AppError("Thiếu token", 400);
        }

        const [tokens]: any = await pool.query(
            "SELECT * FROM refresh_tokens WHERE token = ?",
            [refreshToken]
        );

        if (tokens.length === 0) {
            throw new AppError("Token không hợp lệ", 400);
        }

        jwt.verify(refreshToken, process.env.REFRESH_SECRET as string, async (error: any, decoded: any) => {
            if (error) {
                return next(new AppError("Token không hợp lệ", 400));
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

        if (!refreshToken) {
            throw new AppError("Không có refresh token", 400);
        }

        await pool.query("DELETE FROM refresh_tokens WHERE token = ?", [refreshToken]);

        res.json({ message: "Đăng xuất thành công" });
    } catch (error) {
        next(error);
    }
};
