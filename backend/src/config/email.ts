import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { AppException } from "../middlewares/errorHandler";
import { ErrorCode } from "../types/errorCode";

dotenv.config();

const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export async function sendVerificationEmail(email: string, verificationCode: string) {
    try {

        const mailOptions = {
            from: process.env.EMAIL_USER, 
            to: email, 
            subject: "Xác thực tài khoản",
            html: `<p>Mã xác thực của bạn là: <strong>${verificationCode}</strong></p>`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.messageId);
    } catch (error: any) {
        console.error("Lỗi gửi email:", error);

        if (error.response) {
            throw new AppException(`Lỗi email: ${error.response}`, ErrorCode.SERVER_ERROR, 500);
        }

        throw new AppException("Không thể gửi email xác thực. Vui lòng thử lại.", ErrorCode.SERVER_ERROR, 500);
    }
}
