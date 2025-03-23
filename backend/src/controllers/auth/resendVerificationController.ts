import { NextFunction, Request, Response } from "express";
import pool from "../../config/db";
import { AppError, ErrorCode } from "../../middlewares/errorHandler";
import { emailQueue, redisClient, smsQueue } from "../../config/redis";

export const resendVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        const { contact } = req.body;

        if (!contact) {
            throw new AppError("Vui lòng nhập email hoặc số điện thoại", 400, ErrorCode.MISSING_CREDENTIALS, "contact");
        }

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
        const isPhone = /^\+?[84]\d{1,14}$/.test(contact);

        if (!isEmail && !isPhone) {
            throw new AppError("Định dạng email hoặc số điện thoại không hợp lệ", 400, ErrorCode.INVALID_FORMAT, "contact");
        }

        const ipAddress = req.ip;
        const resendCount = await redisClient.get(`resend_verification_count:${ipAddress}`);
        if (resendCount && parseInt(resendCount) >= 5) {
            throw new AppError("Quá nhiều lần yêu cầu, vui lòng thử lại sau", 429, ErrorCode.TOO_MANY_ATTEMPTS);
        }

        const [users]: any = await connection.query(
            "SELECT * FROM users WHERE (email = ? OR phone_number = ?) AND is_verified = 0",
            [contact, contact]
        );

        if (users.length === 0) {
            throw new AppError("Tài khoản không tồn tại hoặc đã được xác thực", 400, ErrorCode.ACCOUNT_NOT_FOUND, "contact");
        }

        const user = users[0];
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationExpires = new Date(Date.now() + 3 * 60 * 1000); // 3 phút

        await connection.beginTransaction();

        if (isEmail) {
            await connection.query(
                `UPDATE users SET 
                 email_verification_code = ?, 
                 email_verification_expires = ? 
                 WHERE user_id = ?`,
                [verificationCode, verificationExpires, user.user_id]
            );

            await connection.commit();

            await emailQueue.add('send-verification-email', {
                email: contact,
                code: verificationCode
            }, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                }
            });

            await redisClient.incr(`resend_verification_count:${ipAddress}`);
            await redisClient.expire(`resend_verification_count:${ipAddress}`, 60 * 60);

            res.json({ 
                message: "Đã gửi lại mã xác thực qua email",
                verificationType: "email",
                contact: contact
            });
        } else {
            await connection.query(
                `UPDATE users SET 
                 phone_verification_code = ?, 
                 phone_verification_expires = ? 
                 WHERE user_id = ?`,
                [verificationCode, verificationExpires, user.user_id]
            );

            await connection.commit();
            
            await smsQueue.add('send-verifiaction-sms', {
                phone: contact,
                code: verificationCode
            }, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                }
            });

            await redisClient.incr(`resend_verification_count:${ipAddress}`);
            await redisClient.expire(`resend_verification_count:${ipAddress}`, 60 * 60);

            res.json({ 
                message: "Đã gửi lại mã xác thực qua SMS",
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