import Joi, { ObjectSchema} from "joi";
import { Request, Response, NextFunction } from "express";

export const loginSchema: ObjectSchema = Joi.object({
    login: Joi.string().required().messages({
        "string.empty": "Email hoặc số điện thoại không được để trống",
    }),
    password: Joi.string().min(6).required().messages({
        "string.empty": "Mật khẩu không được để trống",
        "string.min": "Mật khẩu phải có ít nhất 6 ký tự",
    }),
});

