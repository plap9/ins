import { Request, Response, NextFunction } from "express";
import { Schema, ValidationError } from "joi";
import { AppError } from "../middlewares/errorHandler";
import { ErrorCode } from "../types/errorCode";

export const validate = (schema: Schema) => 
    (req: Request, res: Response, next: NextFunction): void => {
        const { error } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            const errors = error.details.map((err) => err.message);
            return next(new AppError("Dữ liệu không hợp lệ", 400, ErrorCode.VALIDATION_ERROR));
        }

        next();
    };
