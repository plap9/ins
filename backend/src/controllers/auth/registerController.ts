import { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import pool from "../../config/db";
import { sendVerificationEmail } from "../../config/email";
import { sendOTP } from "../../config/sms";

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