import crypto from "crypto";
import emailService from "../config/email";
import smsService from "../config/sms";

class VerificationService {
  public generateVerificationToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  public generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  public async sendEmailVerification(email: string, token: string) {
    await emailService.sendVerificationEmail(email, token);
  }

  public async sendPhoneVerification(phone: string, otp: string) {
    await smsService.sendOTP(phone, otp);
  }
}

export default new VerificationService();
