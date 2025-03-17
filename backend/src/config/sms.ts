import twilio, { Twilio } from "twilio";
import dotenv from "dotenv";
import { AppError } from "../middlewares/errorHandler";

dotenv.config();

interface ISMSService {
  sendOTP(phone: string, otp: string): Promise<void>;
}

class SMSService implements ISMSService {
  private client: Twilio;

  constructor() {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      throw new AppError("Cấu hình Twilio chưa đầy đủ", 500);
    }

    this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }

  public async sendOTP(phone: string, otp: string): Promise<void> {
    try {
      const message = await this.client.messages.create({
        body: `Mã OTP của bạn là: ${otp}. Vui lòng nhập để xác thực.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });

      console.log("OTP đã gửi:", message.sid);
    } catch (error: any) {
      console.error("Lỗi gửi OTP:", error);

      if (error.code) {
        throw new AppError(`Lỗi Twilio: ${error.message}`, 500);
      }

      throw new AppError("Không thể gửi OTP. Vui lòng thử lại.", 500);
    }
  }
}

const smsService = new SMSService();
export default smsService;
