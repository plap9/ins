import { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import pool from "../config/db";
import { sendVerificationEmail } from "../config/email";
import { sendOTP } from "../config/sms";

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { username, contact, password } = req.body;

        if (!username || !contact || !password) {
            res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin" });
            return;
        }

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
        const isPhone = /^\+?[84]\d{1,14}$/.test(contact);

        if (!isEmail && !isPhone) {
            res.status(400).json({ error: "Định dạng email hoặc số điện thoại không hợp lệ" });
            return;
        }

        const [existingUsers]: any = await pool.query(
            "SELECT * FROM users WHERE email = ? OR phone_number = ?",
            [contact, contact]
        );

        if (existingUsers.length > 0) {
            res.status(400).json({ error: "Email hoặc số điện thoại đã tồn tại" });
            return;
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

            res.status(201).json({ message: "Vui lòng kiểm tra email để xác thực." });
            return;
        } else {
            const phoneVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            const phoneVerificationExpires = new Date(Date.now() + 3 * 60 * 1000); 

            await pool.query(
                `INSERT INTO users (username, phone_number, password_hash, phone_verification_code, phone_verification_expires, contact_type) 
                 VALUES (?, ?, ?, ?, ?, ?)`,

                [username, contact, hashedPassword, phoneVerificationCode, phoneVerificationExpires, "phone"]
            );

            await sendOTP(contact, phoneVerificationCode);

            res.status(201).json({ message: "Vui lòng kiểm tra tin nhắn SMS để xác thực." });
        }
    } catch (error) {
        next(error);
    }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { token } = req.query;

        if (!token) {
            res.status(400).json({ error: "Thiếu token xác thực" });
            return;
        }

        const [users]: any = await pool.query(
            "SELECT id FROM users WHERE verification_token = ? AND verification_expires > NOW()",
            [token]
        );

        if (users.length === 0) {
            res.status(400).json({ error: "Token không hợp lệ hoặc đã hết hạn" });
            return;
        }

        const userId = users[0].id;

        await pool.query(
            "UPDATE users SET email_verified = 1, verification_token = NULL, verification_expires = NULL WHERE id = ?",
            [userId]
        );

        res.json({ message: "Xác thực email thành công!" });
    } catch (error) {
        next(error);
    }
};

export const verifyPhone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            res.status(400).json({ error: "Thiếu số điện thoại hoặc mã OTP" });
            return;
        }

        const [users]: any = await pool.query(
            "SELECT id FROM users WHERE phone_number = ? AND phone_verification_code = ? AND phone_verification_expires > NOW()",
            [phone, otp]
        );

        if (users.length === 0) {   
            res.status(400).json({ error: "Mã OTP không hợp lệ hoặc đã hết hạn" });
            return;
        }

        const userId = users[0].id;

        await pool.query(
            "UPDATE users SET phone_verified = 1, phone_verification_code = NULL, phone_verification_expires = NULL WHERE id = ?",
            [userId]
        );

        res.json({ message: "Xác thực số điện thoại thành công!" });
    } catch (error) {
        next(error);
    }
};

