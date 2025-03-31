import Joi from "joi";

export const createCommentSchema = Joi.object({
    content: Joi.string().trim().required().messages({
        "string.empty": "Nội dung bình luận không được để trống",
        "any.required": "Nội dung bình luận là bắt buộc"
    }),
    parent_id: Joi.number().integer().positive().allow(null).optional()
});

export const updateCommentSchema = Joi.object({
    content: Joi.string().trim().required().messages({
        "string.empty": "Nội dung bình luận không được để trống",
        "any.required": "Nội dung bình luận là bắt buộc"
    })
});