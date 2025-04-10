import { Request, Response } from "express";
import crypto from "crypto";
import connection from "../../config/db";
import { AppException } from "../../middlewares/errorHandler";
import { ErrorCode } from "../../types/errorCode";
import { createController } from "../../utils/errorUtils";
import bcrypt from "bcryptjs";

// Xử lý yêu cầu quên mật khẩu
const forgotPasswordHandler = async (req: Request, res: Response): Promise<void> => {
  const { contact } = req.body; // Email hoặc số điện thoại

  if (!contact) {
    throw new AppException(
      "Vui lòng cung cấp email hoặc số điện thoại", 
      ErrorCode.MISSING_CREDENTIALS, 
      400
    );
  }

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const isPhone = /^\+?[0-9]{10,15}$/.test(contact);

  if (!isEmail && !isPhone) {
    throw new AppException(
      "Định dạng email hoặc số điện thoại không hợp lệ", 
      ErrorCode.INVALID_FORMAT, 
      400, 
      { field: "contact" }
    );
  }

  // Tạo mã reset ngẫu nhiên
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString(); // Mã 6 số
  const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

  const [users] = await connection.query(
    "SELECT id FROM users WHERE email = ? OR phone_number = ?",
    [isEmail ? contact : null, isPhone ? contact : null]
  );

  if ((users as any[]).length === 0) {
    throw new AppException(
      "Tài khoản không tồn tại", 
      ErrorCode.ACCOUNT_NOT_FOUND, 
      404
    );
  }

  const userId = (users as any[])[0].id;

  // Bắt đầu giao dịch
  await connection.beginTransaction();

  try {
    // Lưu thông tin reset password vào database
    await connection.execute(
      `UPDATE users SET 
       reset_token = ?, 
       reset_code = ?, 
       reset_expires = ? 
       WHERE id = ?`,
      [resetToken, resetCode, resetExpires, userId]
    );

    // Gửi mã xác nhận qua email hoặc SMS
    if (isEmail) {
      // TODO: Integrate with actual email service
      // sendEmail(contact, resetCode);
      console.log(`[DEV] Gửi mã reset ${resetCode} đến email ${contact}`);
    } else {
      // TODO: Integrate with actual SMS service
      // sendSMS(contact, resetCode);
      console.log(`[DEV] Gửi mã reset ${resetCode} đến số điện thoại ${contact}`);
    }

    await connection.commit();

    res.json({
      status: "success",
      message: `Mã xác nhận đã được gửi tới ${isEmail ? 'email' : 'số điện thoại'} của bạn`,
      data: {
        tokenType: "reset",
        resetToken: resetToken,
        contact: contact,
        method: isEmail ? "email" : "sms"
      }
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  }
};

// Xác nhận mã reset và cập nhật mật khẩu mới
const resetPasswordHandler = async (req: Request, res: Response): Promise<void> => {
  const { resetToken, code, newPassword } = req.body;

  if (!resetToken || !code || !newPassword) {
    throw new AppException(
      "Vui lòng cung cấp đầy đủ thông tin", 
      ErrorCode.MISSING_CREDENTIALS, 
      400
    );
  }

  // Kiểm tra độ dài và độ phức tạp của mật khẩu
  if (newPassword.length < 8) {
    throw new AppException(
      "Mật khẩu phải có ít nhất 8 ký tự", 
      ErrorCode.INVALID_FORMAT, 
      400, 
      { field: "newPassword" }
    );
  }

  // Tìm người dùng với mã reset
  const [users] = await connection.query(
    `SELECT id, reset_expires, reset_code FROM users 
     WHERE reset_token = ? AND reset_expires > NOW()`,
    [resetToken]
  );

  if ((users as any[]).length === 0) {
    throw new AppException(
      "Mã xác nhận không hợp lệ hoặc đã hết hạn", 
      ErrorCode.INVALID_VERIFICATION, 
      400
    );
  }

  const user = (users as any[])[0];

  // Kiểm tra mã xác nhận
  if (user.reset_code !== code) {
    throw new AppException(
      "Mã xác nhận không chính xác", 
      ErrorCode.INVALID_VERIFICATION, 
      400, 
      { field: "code" }
    );
  }

  // Băm mật khẩu mới
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Bắt đầu giao dịch
  await connection.beginTransaction();

  try {
    // Cập nhật mật khẩu và xóa thông tin reset
    await connection.execute(
      `UPDATE users SET 
       password = ?, 
       reset_token = NULL, 
       reset_code = NULL, 
       reset_expires = NULL 
       WHERE id = ?`,
      [hashedPassword, user.id]
    );

    await connection.commit();

    res.json({
      status: "success",
      message: "Mật khẩu đã được cập nhật thành công"
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  }
};

export const forgotPassword = createController(forgotPasswordHandler, 'Auth:ForgotPassword');
export const resetPassword = createController(resetPasswordHandler, 'Auth:ResetPassword');