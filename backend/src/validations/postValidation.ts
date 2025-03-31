import Joi, { ObjectSchema } from "joi";

export const postSchema: ObjectSchema = Joi.object({
    content: Joi.string().allow('').optional(),
    location: Joi.string().allow('').optional(),
    privacy: Joi.string().valid('public', 'friends', 'private').default('public').messages({
        "any.only": "Quyền riêng tư phải là 'public', 'friends' hoặc 'private'",
    }),
});