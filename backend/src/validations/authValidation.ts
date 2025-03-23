import Joi, { ObjectSchema } from "joi";

export const loginSchema: ObjectSchema = Joi.object({
    login: Joi.string().required().messages({
        "string.empty": "Email hoặc số điện thoại không được để trống",
    }),
    password: Joi.string().min(6).required().messages({
        "string.empty": "Mật khẩu không được để trống",
        "string.min": "Mật khẩu phải có ít nhất 6 ký tự",
    }),
});

export const registerSchema: ObjectSchema = Joi.object({
    username: Joi.string().min(3).max(30).required().messages({
        "string.empty": "Tên người dùng không được để trống",
        "string.min": "Tên người dùng phải có ít nhất 3 ký tự",
        "string.max": "Tên người dùng không được quá 30 ký tự",
    }),
    contact: Joi.string().required().messages({
        "string.empty": "Email hoặc số điện thoại không được để trống",
    }),
    password: Joi.string().min(6).required().messages({
        "string.empty": "Mật khẩu không được để trống",
        "string.min": "Mật khẩu phải có ít nhất 6 ký tự",
    }),
});

export const verifyPhoneSchema: ObjectSchema = Joi.object({
    phone: Joi.string()
        .pattern(/^\+84[3|5|7|8|9]\d{8}$/)
        .required()
        .messages({
            "string.empty": "Số điện thoại không được để trống",
            "string.pattern.base": "Số điện thoại phải có định dạng +84xxxxxxxxx"
        }),
    code: Joi.string()
        .length(6)
        .pattern(/^\d+$/)
        .required()
        .messages({
            "string.empty": "Mã OTP không được để trống",
            "string.length": "Mã OTP phải có đúng 6 chữ số",
            "string.pattern.base": "Mã OTP chỉ được chứa số từ 0-9"
        }),
});