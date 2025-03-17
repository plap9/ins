import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { AppError } from "../../middlewares/errorHandler";
import UserService from "../../services/UserService";
import VerificationService from "../../services/VerificationService";

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, contact, password } = req.body;

    if (!username || !contact || !password) {
      throw new AppError("Vui lòng nhập đầy đủ thông tin", 400);
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    const isPhone = /^\+?[84]\d{1,14}$/.test(contact);

    if (!isEmail && !isPhone) {
      throw new AppError("Định dạng email hoặc số điện thoại không hợp lệ", 400);
    }

    const existingUser = await UserService.getUserByContact(contact);
    if (existingUser) {
      throw new AppError("Email hoặc số điện thoại đã tồn tại", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (isEmail) {
      const verificationToken = VerificationService.generateVerificationToken();
      await UserService.createUserWithEmail(username, contact, hashedPassword, verificationToken);
      await VerificationService.sendEmailVerification(contact, verificationToken);
      res.status(201).json({ message: "Vui lòng kiểm tra email để xác thực." });
    } else {
      const otpCode = VerificationService.generateOTP();
      await UserService.createUserWithPhone(username, contact, hashedPassword, otpCode);
      await VerificationService.sendPhoneVerification(contact, otpCode);
      res.status(201).json({ message: "Vui lòng kiểm tra tin nhắn SMS để xác thực." });
    }
  } catch (error) {
    next(error);
  }
};
