import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import pool from "../../config/db";

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            res.status(400).json({ error: "Thiếu token" });
            return;
        }

        const [tokens]: any = await pool.query(
            "SELECT * FROM refresh_tokens WHERE token = ?",
            [refreshToken]
        )

        if (tokens.length === 0) {
            res.status(400).json({ error: "Token không hợp lệ" });
            return;
        }

        jwt.verify(refreshToken, process.env.REFRESH_SECRET as string, async (error: any, decoded: any) => {
            if (error) {
                return res.status(400).json({ error: "Token không hợp lệ" });
            }
            const newAcessToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET as string, {
                expiresIn: "1h",
            });

            res.json({ token: newAcessToken });
        });
    } catch (error) {
        next(error);
    }
};

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