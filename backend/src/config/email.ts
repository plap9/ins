import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { AppError } from "../middlewares/errorHandler";

dotenv.config();

const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export async function sendVerificationEmail(email: string, verificationToken: string) {
    try {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Xác thực tài khoản",
            html: `<p>Nhấp vào link sau để xác thực tài khoản:</p><a href="${verificationUrl}">${verificationUrl}</a>`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.messageId);
    } catch (error: any) {
        console.error("Lỗi gửi email:", error);

        if (error.response) {
            throw new AppError(`Lỗi email: ${error.response}`, 500);
        }

        throw new AppError("Không thể gửi email xác thực. Vui lòng thử lại.", 500);
    }
}
