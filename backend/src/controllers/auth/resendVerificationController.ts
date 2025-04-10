import { NextFunction, Request, Response } from "express";
import pool from "../../config/db";
import { AppException } from "../../middlewares/errorHandler";
import { ErrorCode } from "../../types/errorCode";
import { emailQueue, redisClient, smsQueue } from "../../config/redis";

export const resendVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        const { contact } = req.body;

        if (!contact) {
            throw new AppException("Vui lòng nhập email hoặc số điện thoại", ErrorCode.MISSING_CREDENTIALS, 400, { field: "contact" });
        }

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
        const isPhone = /^\+?[84]\d{1,14}$/.test(contact);

        if (!isEmail && !isPhone) {
            throw new AppException("Định dạng email hoặc số điện thoại không hợp lệ", ErrorCode.INVALID_FORMAT, 400, { field: "contact" });
        }

        const ipAddress = req.ip;
        const resendCount = await redisClient.get(`resend_verification_count:${ipAddress}`);
        if (resendCount && parseInt(resendCount) >= 5) {
            throw new AppException("Quá nhiều lần yêu cầu, vui lòng thử lại sau", ErrorCode.TOO_MANY_ATTEMPTS, 429);
        }

        const [users]: any = await connection.query(
            "SELECT * FROM users WHERE (email = ? OR phone_number = ?) AND is_verified = 0",
            [contact, contact]
        );

        if (users.length === 0) {
            throw new AppException("Tài khoản không tồn tại hoặc đã được xác thực", ErrorCode.ACCOUNT_NOT_FOUND, 400, { field: "contact" });
        }

        const user = users[0];
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationExpires = new Date(Date.now() + 3 * 60 * 1000); 

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