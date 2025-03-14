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
});