import Joi, { ObjectSchema } from "joi";

export const loginSchema: ObjectSchema = Joi.object({
    login: Joi.string().trim().required().messages({
        "string.empty": "Email hoặc số điện thoại không được để trống",
    }),
    password: Joi.string().trim().min(6).required().messages({
        "string.empty": "Mật khẩu không được để trống",
        "string.min": "Mật khẩu phải có ít nhất 6 ký tự",
    }),
});

export const registerSchema: ObjectSchema = Joi.object({
    username: Joi.string().trim().min(3).max(30).pattern(/^[a-zA-Z0-9_-]+$/).required().messages({
        "string.empty": "Tên người dùng không được để trống",
        "string.min": "Tên người dùng phải có ít nhất 3 ký tự",
        "string.max": "Tên người dùng không được quá 30 ký tự",
        "string.pattern.base": "Tên người dùng chỉ được chứa chữ cái và số và các ký tự , _ -",
    }),
    contact: Joi.string().trim().max(255).required().messages({
        "string.empty": "Email hoặc số điện thoại không được để trống",
        "string.max": "Email hoặc số điện thoại không được quá 255 ký tự",
    }),
    password: Joi.string()
        .trim()
        .min(8)
        .max(128)
        .custom((value, helpers) => {
            if (!/(?=.*[a-z])/.test(value)) {
                return helpers.error('password.lowercase');
            }
            if (!/(?=.*[A-Z])/.test(value)) {
                return helpers.error('password.uppercase');
            }
            if (!/(?=.*\d)/.test(value)) {
                return helpers.error('password.number');
            }
            if (!/(?=.*[@$!%*?&])/.test(value)) {
                return helpers.error('password.special');
            }
            return value;
        })
        .required()
        .messages({
            "string.empty": "Mật khẩu không được để trống",
            "string.min": "Mật khẩu phải có ít nhất 8 ký tự",
            "string.max": "Mật khẩu không được quá 128 ký tự",
            "password.lowercase": "Mật khẩu phải chứa ít nhất 1 chữ thường",
            "password.uppercase": "Mật khẩu phải chứa ít nhất 1 chữ hoa",
            "password.number": "Mật khẩu phải chứa ít nhất 1 số",
            "password.special": "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt",
        }),
});

export const verifyPhoneSchema: ObjectSchema = Joi.object({
    phone: Joi.string()
        .trim()
        .pattern(/^\+84[3|5|7|8|9]\d{8}$/)
        .required()
        .messages({
            "string.empty": "Số điện thoại không được để trống",
            "string.pattern.base": "Số điện thoại phải có định dạng +84xxxxxxxxx"
        }),
    code: Joi.string()
        .trim()
        .length(6)
        .pattern(/^\d+$/)
        .required()
        .messages({
            "string.empty": "Mã OTP không được để trống",
            "string.length": "Mã OTP phải có đúng 6 chữ số",
            "string.pattern.base": "Mã OTP chỉ được chứa số từ 0-9"
        }),
});

export const verifySchema: ObjectSchema = Joi.object({
    contact: Joi.string().trim().required().messages({
      "string.empty": "Email/số điện thoại không được để trống",
    }),
    code: Joi.string()
      .trim()
      .length(6)
      .pattern(/^\d+$/)
      .required()
      .messages({
        "string.empty": "Mã xác thực không được để trống",
        "string.length": "Mã xác thực phải có đúng 6 chữ số",
        "string.pattern.base": "Mã xác thực chỉ được chứa số từ 0-9"
      }),
    verificationType: Joi.string()
      .trim()
      .valid('email', 'phone')
      .required()
      .messages({
        "any.only": "Loại xác thực không hợp lệ",
        "string.empty": "Loại xác thực không được để trống"
      })
  });
  
  export const resendVerificationSchema: ObjectSchema = Joi.object({
    contact: Joi.string().trim().required().messages({
      "string.empty": "Email/số điện thoại không được để trống",
    }),
    verificationType: Joi.string()
      .trim()
      .valid('email', 'phone')
      .required()
      .messages({
        "any.only": "Loại xác thực không hợp lệ",
        "string.empty": "Loại xác thực không được để trống"
      })
  });

  export const forgotPasswordSchema: ObjectSchema = Joi.object({
    contact: Joi.string().trim().required().messages({
      "string.empty": "Vui lòng nhập email hoặc số điện thoại"
    })
  });
  
  export const resetPasswordSchema = Joi.object({
    contact: Joi.string().trim().required().messages({
      "string.empty": "Email hoặc số điện thoại không được để trống"
    }),
    code: Joi.string().trim().length(6).required().messages({
      "string.empty": "Mã xác thực không được để trống",
      "string.length": "Mã xác thực phải có 6 chữ số"
    }),
    newPassword: Joi.string()
      .trim()
      .min(8)
      .max(128)
      .custom((value, helpers) => {
          if (!/(?=.*[a-z])/.test(value)) {
              return helpers.error('password.lowercase');
          }
          if (!/(?=.*[A-Z])/.test(value)) {
              return helpers.error('password.uppercase');
          }
          if (!/(?=.*\d)/.test(value)) {
              return helpers.error('password.number');
          }
          if (!/(?=.*[@$!%*?&])/.test(value)) {
              return helpers.error('password.special');
          }
          return value;
      })
      .required()
      .messages({
          "string.empty": "Mật khẩu không được để trống",
          "string.min": "Mật khẩu phải có ít nhất 8 ký tự",
          "string.max": "Mật khẩu không được quá 128 ký tự",
          "password.lowercase": "Mật khẩu phải chứa ít nhất 1 chữ thường",
          "password.uppercase": "Mật khẩu phải chứa ít nhất 1 chữ hoa",
          "password.number": "Mật khẩu phải chứa ít nhất 1 số",
          "password.special": "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt",
      })
  });