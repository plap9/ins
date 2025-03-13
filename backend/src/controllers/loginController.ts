import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db";

export const login = async (req: Request, res: Response) => {
    try {
        const { login, password } = req.body;

        if (!login || !password) {
            return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin" });
        }

        const [users]: any = await pool.query(
            "SELECT * FROM users WHERE email = ? OR phone_number = ?",
            [login, login]
        );
        const user = users[0];

        if (!user) {
            return res.status(400).json({ error: "Tài khoản không tồn tại" });
        }

        if (!user.email_verified && !user.phone_verified) {
            return res.status(400).json({ error: "Tài khoản chưa được xác thực" });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: "Sai mật khẩu" });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, {
            expiresIn: "1h",
        });

        await pool.query("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id]);

        const { password_hash, ...userWithoutPassword } = user;

        res.json({ token, user: userWithoutPassword });

    } catch (error) {
        console.error("Lỗi khi đăng nhập:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
};