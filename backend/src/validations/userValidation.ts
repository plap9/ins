import Joi, { ObjectSchema } from "joi";

export const updateUserSchema: ObjectSchema = Joi.object({
    full_name: Joi.string().allow('').optional(),
    bio: Joi.string().allow('').optional().max(150).messages({
        "string.max": "Tiểu sử không được quá 150 ký tự",
    }),
    profile_picture: Joi.string().allow('').optional(),
    website: Joi.string().allow('').optional().uri().messages({
        "string.uri": "Website phải là một URL hợp lệ",
    }),
    gender: Joi.string().allow('').optional().valid('male', 'female', 'other').messages({
        "any.only": "Giới tính phải là 'male', 'female' hoặc 'other'",
    }),
    date_of_birth: Joi.date().optional().messages({
        "date.base": "Ngày sinh không hợp lệ",
    }),
    username: Joi.string().optional().min(3).max(20).pattern(/^[a-zA-Z0-9_\.]+$/).messages({
        "string.min": "Tên người dùng phải có ít nhất 3 ký tự",
        "string.max": "Tên người dùng không được quá 20 ký tự",
        "string.pattern.base": "Tên người dùng chỉ được chứa chữ cái, số, dấu gạch dưới và dấu chấm",
    }),
    avatar_base64: Joi.string().optional(),
});