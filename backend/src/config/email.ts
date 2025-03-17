import nodemailer, { Transporter } from "nodemailer";
import dotenv from "dotenv";
import { AppError } from "../middlewares/errorHandler";

dotenv.config();

interface IEmailService {
  sendVerificationEmail(email: string, verificationToken: string): Promise<void>;
}

class EmailService implements IEmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  public async sendVerificationEmail(email: string, verificationToken: string): Promise<void> {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Xác thực tài khoản",
        html: `<p>Nhấp vào link sau để xác thực tài khoản:</p><a href="${verificationUrl}">${verificationUrl}</a>`,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("Email đã gửi:", info.messageId);
    } catch (error: any) {
      console.error("Lỗi gửi email:", error);

      if (error.response) {
        throw new AppError(`Lỗi email: ${error.response}`, 500);
      }

      throw new AppError("Không thể gửi email xác thực. Vui lòng thử lại.", 500);
    }
  }
}

const emailService = new EmailService();
export default emailService;
