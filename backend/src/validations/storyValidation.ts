import Joi from "joi";

export const storySchema = Joi.object({
    has_text: Joi.boolean().default(false),
    sticker_data: Joi.string().allow(null, ''),
    filter_data: Joi.string().allow(null, ''),
    close_friends_only: Joi.boolean().default(false)
});

export const replyStorySchema = Joi.object({
    content: Joi.string().required().min(1).max(1000).messages({
        'string.empty': 'Nội dung trả lời không được để trống',
        'string.min': 'Nội dung trả lời phải có ít nhất 1 ký tự',
        'string.max': 'Nội dung trả lời không được vượt quá 1000 ký tự'
    })
});

export const addToHighlightSchema = Joi.object({
    highlight_id: Joi.number().integer().when('highlight_title', {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.required()
    }).messages({
        'number.base': 'ID của highlight phải là số nguyên',
        'any.required': 'Phải cung cấp highlight_id hoặc highlight_title'
    }),
    highlight_title: Joi.string().min(1).max(100).when('highlight_id', {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.required()
    }).messages({
        'string.min': 'Tiêu đề highlight phải có ít nhất 1 ký tự',
        'string.max': 'Tiêu đề highlight không được vượt quá 100 ký tự',
        'any.required': 'Phải cung cấp highlight_id hoặc highlight_title'
    })
});