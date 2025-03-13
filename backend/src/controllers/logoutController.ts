import { NextFunction, Request, Response } from "express";
import pool from "../config/db";

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            res.status(400).json({ error: "Không có refresh token" });
            return;
        }
        await pool.query("DELETE FROM refresh_tokens WHERE token = ?", [refreshToken]);

        res.json({ message: "Đăng xuất thành công" });
    } catch (error) {
        next(error);
    }
};
