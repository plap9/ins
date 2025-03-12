import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db";

export const register = async (req: Request, res: Response) => {
    try {
        const { username, email, phone_number, password } = req.body;

        if (!username || !email || !phone_number || !password) {
            return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin" });
        }

        const [existingUsers]: any = await pool.query(
            "SELECT * FROM users WHERE email = ? OR phone_number = ?",
            [email, phone_number]
        );
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: "Email hoặc số điện thoại đã tồn tại" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt); 

        await pool.query(
            "INSERT INTO users (username, email, phone_number, password_hash) VALUES (?, ?, ?, ?)",
            [username, email, phone_number, hashedPassword] 
        );

        res.status(201).json({ message: "Đăng ký thành công!" });
    } catch (error) {
        console.error("Lỗi khi đăng ký:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
};

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

        
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: "Sai mật khẩu" });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, {
            expiresIn: "1h",
        });

        res.json({ token, user });
    } catch (error) {
        console.error("Lỗi khi đăng nhập:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
};
