import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import pool from "../config/db";
import { sendVerificationEmail } from "../config/email";
import { sendOTP } from "../config/sms";

export const register = async (req: Request, res: Response) => {
    try {
        const { username, contact, password } = req.body;

        if (!username || !contact || !password) {
            return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin" });
        }

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
        const isPhone = /^\+?[84]\d{1,14}$/.test(contact);

        if (!isEmail && !isPhone) {
            return res.status(400).json({ error: "Định dạng email hoặc số điện thoại không hợp lệ" });
        }

        const [existingUsers]: any = await pool.query(
            "SELECT * FROM users WHERE email = ? OR phone_number = ?",
            [contact, contact]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: "Email hoặc số điện thoại đã tồn tại" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        if (isEmail) {
            const verificationToken = crypto.randomBytes(32).toString("hex");
            const verificationExpires = new Date(Date.now() + 3 * 60 * 1000); 

            await pool.query(
                `INSERT INTO users (username, email, password_hash, verification_token, verification_expires, contact_type) 
                 VALUES (?, ?, ?, ?, ?, ?)`,

                [username, contact, hashedPassword, verificationToken, verificationExpires, "email"]
            );

            await sendVerificationEmail(contact, verificationToken);

            return res.status(201).json({ message: "Vui lòng kiểm tra email để xác thực." });
        } else {
            const phoneVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            const phoneVerificationExpires = new Date(Date.now() + 3 * 60 * 1000); 

            await pool.query(
                `INSERT INTO users (username, phone_number, password_hash, phone_verification_code, phone_verification_expires, contact_type) 
                 VALUES (?, ?, ?, ?, ?, ?)`,

                [username, contact, hashedPassword, phoneVerificationCode, phoneVerificationExpires, "phone"]
            );

            await sendOTP(contact, phoneVerificationCode);

            return res.status(201).json({ message: "Vui lòng kiểm tra tin nhắn SMS để xác thực." });
        }
    } catch (error) {
        console.error("Lỗi khi đăng ký:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
};

export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: "Thiếu token xác thực" });
        }

        const [users]: any = await pool.query(
            "SELECT id FROM users WHERE verification_token = ? AND verification_expires > NOW()",
            [token]
        );

        if (users.length === 0) {
            return res.status(400).json({ error: "Token không hợp lệ hoặc đã hết hạn" });
        }

        const userId = users[0].id;

        await pool.query(
            "UPDATE users SET email_verified = 1, verification_token = NULL, verification_expires = NULL WHERE id = ?",
            [userId]
        );

        return res.json({ message: "Xác thực email thành công!" });
    } catch (error) {
        console.error("Lỗi xác thực email:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
};

export const verifyPhone = async (req: Request, res: Response) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ error: "Thiếu số điện thoại hoặc mã OTP" });
        }

        const [users]: any = await pool.query(
            "SELECT id FROM users WHERE phone_number = ? AND phone_verification_code = ? AND phone_verification_expires > NOW()",
            [phone, otp]
        );

        if (users.length === 0) {
            return res.status(400).json({ error: "Mã OTP không hợp lệ hoặc đã hết hạn" });
        }

        const userId = users[0].id;

        await pool.query(
            "UPDATE users SET phone_verified = 1, phone_verification_code = NULL, phone_verification_expires = NULL WHERE id = ?",
            [userId]
        );

        return res.json({ message: "Xác thực số điện thoại thành công!" });
    } catch (error) {
        console.error("Lỗi xác thực số điện thoại:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
};