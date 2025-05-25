import { Request, Response } from "express";
import crypto from "crypto";
import connection from "../../config/db";
import { AppException } from "../../middlewares/errorHandler";
import { ErrorCode } from "../../types/errorCode";
import { createController } from "../../utils/errorUtils";
import bcrypt from "bcryptjs";
import { resetPasswordSchema } from "../../validations/authValidation";

const forgotPasswordHandler = async (req: Request, res: Response): Promise<void> => {
  const { contact } = req.body;
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

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const resetExpires = new Date(Date.now() + 15 * 60 * 1000); 

  const [users] = await connection.query(
    "SELECT user_id FROM users WHERE email = ? OR phone_number = ?",
    [isEmail ? contact : null, isPhone ? contact : null]
  );

  if ((users as any[]).length === 0) {
    throw new AppException(
      "Tài khoản không tồn tại", 
      ErrorCode.ACCOUNT_NOT_FOUND, 
      404
    );
  }

  const userId = (users as any[])[0].user_id;

  await connection.beginTransaction();

  try {
    await connection.execute(
      `UPDATE users SET 
       reset_password_code = ?, 
       reset_password_expires = ? 
       WHERE user_id = ?`,
      [resetCode, resetExpires, userId]
    );

    if (isEmail) {
      console.log(`[DEV] Gửi mã reset ${resetCode} đến email ${contact}`);
    } else {
      console.log(`[DEV] Gửi mã reset ${resetCode} đến số điện thoại ${contact}`);
    }

    await connection.commit();

    res.json({
      status: "success",
      message: `Mã xác nhận đã được gửi tới ${isEmail ? 'email' : 'số điện thoại'} của bạn`,
      data: {
        contact: contact,
        method: isEmail ? "email" : "sms"
      }
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  }
};

const resetPasswordHandler = async (req: Request, res: Response): Promise<void> => {
  // Validate input using Joi schema
  const { error, value } = resetPasswordSchema.validate(req.body);
  if (error) {
    throw new AppException(
      error.details[0].message,
      ErrorCode.VALIDATION_ERROR,
      400,
      { field: error.details[0].path[0] }
    );
  }

  const { contact, code, newPassword } = value;

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

  const [users] = await connection.query(
    `SELECT user_id, reset_password_expires, reset_password_code, password_hash FROM users 
     WHERE (email = ? OR phone_number = ?) AND reset_password_expires > NOW()`,
    [isEmail ? contact : null, isPhone ? contact : null]
  );

  if ((users as any[]).length === 0) {
    throw new AppException(
      "Mã xác nhận không hợp lệ hoặc đã hết hạn", 
      ErrorCode.INVALID_VERIFICATION, 
      400
    );
  }

  const user = (users as any[])[0];

  if (user.reset_password_code !== code) {
    throw new AppException(
      "Mã xác nhận không chính xác", 
      ErrorCode.INVALID_VERIFICATION, 
      400, 
      { field: "code" }
    );
  }

  // Check if new password is same as current password
  const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
  if (isSamePassword) {
    throw new AppException(
      "Mật khẩu mới không được trùng với mật khẩu cũ", 
      ErrorCode.INVALID_FORMAT, 
      400, 
      { field: "newPassword" }
    );
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await connection.beginTransaction();

  try {
    await connection.execute(
      `UPDATE users SET 
       password_hash = ?, 
       reset_password_code = NULL, 
       reset_password_expires = NULL 
               WHERE user_id = ?`,
      [hashedPassword, user.user_id]
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