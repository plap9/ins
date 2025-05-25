import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import connection from "../../config/db";
import { AppException } from "../../middlewares/errorHandler";
import { ErrorCode } from "../../types/errorCode";
import { createController } from "../../utils/errorUtils";

const registerHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { username, email, phone, password } = req.body;
        const contact = email || phone;

        if (!username || !contact || !password) {
            throw new AppException(
                "Vui lòng nhập đầy đủ thông tin",
                ErrorCode.MISSING_CREDENTIALS,
                400
            );
        }

        const isEmail = email ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) : false;
        const isPhone = phone ? /^\+?[0-9]{10,15}$/.test(phone) : false;

        if (!isEmail && !isPhone) {
            res.status(400).json({ error: "Định dạng email hoặc số điện thoại không hợp lệ" });
            return;
        }

        const [existingUsers]: any = await pool.query(
            "SELECT * FROM users WHERE email = ? OR phone_number = ?",
            [email || null, phone || null]
        );

        if ((existingUsers as any[]).length > 0) {
            throw new AppException(
                "Email hoặc số điện thoại đã tồn tại", 
                ErrorCode.EXISTING_USER, 
                409,
                { field: "contact" }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationExpires = new Date(Date.now() + 30 * 60 * 1000); 

        await connection.beginTransaction();

        if (isEmail) {
            await connection.execute(
                `INSERT INTO users (username, email, password_hash, is_verified, email_verification_code, email_verification_expires, contact_type, reset_password_code) 
                VALUES (?, ?, ?, 0, ?, ?, 'email', LPAD(FLOOR(RAND() * 1000000), 6, '0'))`,
                [username, email, hashedPassword, verificationCode, verificationExpires]
            );


            await connection.commit();

            res.status(201).json({
                status: "success",
                message: "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.",
                data: {
                    username,
                    email,
                    verificationType: "email"
                }
            });
        } else {
            await connection.execute(
                `INSERT INTO users (username, phone_number, password_hash, is_verified, phone_verification_code, phone_verification_expires, contact_type, reset_password_code) 
                VALUES (?, ?, ?, 0, ?, ?, 'phone', LPAD(FLOOR(RAND() * 1000000), 6, '0'))`,
                [username, phone, hashedPassword, verificationCode, verificationExpires]
            );


            await connection.commit();

            res.status(201).json({
                status: "success",
                message: "Đăng ký thành công. Vui lòng kiểm tra tin nhắn SMS để xác thực tài khoản.",
                data: {
                    username,
                    phone,
                    verificationType: "phone"
                }
            });
        }
    } catch (error) {
        await connection.rollback();
        throw error;
    }
};

export const register = createController(registerHandler, 'Auth:Register');
