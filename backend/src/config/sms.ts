import twilio from "twilio";
import dotenv from "dotenv";
import { AppException } from "../middlewares/errorHandler";
import { ErrorCode } from "../types/errorCode";

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
        return message;
    } catch (error: any) {
        console.error("Lỗi gửi OTP:", error);
        
        if (error.code) {
            throw new AppException(`Lỗi SMS: ${error.message}`, ErrorCode.SERVER_ERROR, 500);
        }
        
        throw new AppException("Không thể gửi OTP. Vui lòng thử lại.", ErrorCode.SERVER_ERROR, 500);
    }
};
