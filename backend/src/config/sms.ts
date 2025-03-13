import twilio from "twilio";
import dotenv from "dotenv";

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
    } catch (error) {
        console.error("Lỗi gửi OTP:", error);
        throw new Error("Không thể gửi OTP.");
    }
};
