import twilio from "twilio";
import dotenv from "dotenv";
import { AppError } from "../middlewares/errorHandler";

dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendOTP = async (phone: string, otp: string) => {
    try {
        const message = await client.messages.create({
            body: `Mã OTP của bạn là: ${otp}. Vui lòng nhập để xác thực.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone
        });
        console.log("OTP sent:", message.sid);
    } catch (error: any) {
        console.error("Lỗi gửi OTP:", error);
        
        if (error.code) {
            throw new AppError(`Lỗi Twilio: ${error.message}`, 500);
        }
        
        throw new AppError("Không thể gửi OTP. Vui lòng thử lại.", 500);
    }
};
