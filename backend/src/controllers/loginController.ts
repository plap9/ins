import { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db";

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { login, password } = req.body;

        if (!login || !password) {
            res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin" });
            return;
        }

        const [users]: any = await pool.query(
            "SELECT * FROM users WHERE email = ? OR phone_number = ?",
            [login, login]
        );
        const user = users[0];

        if (!user) {
            res.status(400).json({ error: "Tài khoản không tồn tại" });
            return;
        }

        if (!user.email_verified && !user.phone_verified) {
            res.status(400).json({ error: "Tài khoản chưa được xác thực" });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            res.status(400).json({ error: "Sai mật khẩu" });
            return;
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, {
            expiresIn: "1h",
        });

        const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_SECRET as string, {
            expiresIn: "7d",
        });

        await pool.query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))",
            [user.id, refreshToken]);

        await pool.query("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id]);

        const { password_hash, ...userWithoutPassword } = user;

        res.json({ token, refreshToken ,user: userWithoutPassword });
        return;
    } catch (error) {
        next(error);
    }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { refreshToken} = req.body;

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
            const newAcessToken = jwt.sign({ id: decoded.id}, process.env.JWT_SECRET as string, {
                expiresIn: "1h",
            });

            res.json({ token: newAcessToken });
        });
    } catch (error) {
        next(error);
    }
}
