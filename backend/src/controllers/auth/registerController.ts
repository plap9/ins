import { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import pool from "../../config/db";
import { AppError } from "../../middlewares/errorHandler";
import { ErrorCode } from "../../types/errorCode";
import { emailQueue, redisClient, smsQueue } from "../../config/redis";

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        const { username, contact, password } = req.body;

        if (!username || !contact || !password) {
            throw new AppError("Vui lòng nhập đầy đủ thông tin",400, ErrorCode.MISSING_CREDENTIALS);
        }

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
        const isPhone = /^\+?[84]\d{1,14}$/.test(contact);

        if (!isEmail && !isPhone) {
            throw new AppError("Định dạng email hoặc số điện thoại không hợp lệ", 400, ErrorCode.INVALID_FORMAT, "contact");
        }

        const ipAddress = req.ip;
        const registraitionCount = await redisClient.get(`registration_count:${ipAddress}`);
        if (registraitionCount && parseInt(registraitionCount) >= 5) {
            throw new AppError("Quá nhiều lần đăng ký, vui lòng thử lại sau", 429, ErrorCode.TOO_MANY_ATTEMPTS);
        }

        const [existingUsers]: any = await connection.query(
            "SELECT * FROM users WHERE email = ? OR phone_number = ?",
            [contact, contact]
        );

        if (existingUsers.length > 0) {
            throw new AppError("Email hoặc số điện thoại đã tồn tại", 400, ErrorCode.EXISTING_USER, "contact");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await connection.beginTransaction(); 

        if (isEmail) {
            const emailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            const emailVerificationExpires = new Date(Date.now() + 3 * 60 * 1000); 

            await connection.query(
                `INSERT INTO users (username, email, password_hash, email_verification_code, email_verification_expires, contact_type) 
                 VALUES (?, ?, ?, ?, ?, ?);`,
                [username, contact, hashedPassword, emailVerificationCode, emailVerificationExpires, "email"]
            );

            await connection.commit();

            console.log("[DEBUG] Adding email job to queue for:", contact);
            await emailQueue.add('send-verification-email',{
                email: contact,
                code: emailVerificationCode
            }, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                }
            });

            await redisClient.incr(`registration_count:${ipAddress}`);
            await redisClient.expire(`registration_count:${ipAddress}`, 60 * 60);

            res.status(201).json({ 
                message: "Vui lòng kiểm tra email để xác thực.",
                verificationType: "email",
                contact: contact
            });
        } else {
            const phoneVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            const phoneVerificationExpires = new Date(Date.now() + 3 * 60 * 1000);

            await connection.query(
                `INSERT INTO users (username, phone_number, password_hash, phone_verification_code, phone_verification_expires, contact_type) 
                 VALUES (?, ?, ?, ?, ?, ?);`,
                [username, contact, hashedPassword, phoneVerificationCode, phoneVerificationExpires, "phone"]
            );

            await connection.commit();
            
            await smsQueue.add('send-verifiaction-sms',{
                phone: contact,
                code: phoneVerificationCode
            }, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                }
            });

            await redisClient.incr(`registration_count:${ipAddress}`);
            await redisClient.expire(`registration_count:${ipAddress}`, 60 * 60);

            res.status(201).json({ 
                message: "Vui lòng kiểm tra tin nhắn SMS để xác thực.",
                verificationType: "phone",
                contact: contact
            });
        }
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};
