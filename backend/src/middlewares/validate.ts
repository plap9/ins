import { Request, Response, NextFunction } from "express";
import { Schema } from "joi";
import { AppException } from "./errorHandler";
import { ErrorCode } from "../types/errorCode";

export const validate = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const validationError = error.details[0];
      const message = validationError.message;
      const field = validationError.path.join('.');
      
      return next(new AppException(
        `Dữ liệu không hợp lệ: ${message}`,
        ErrorCode.VALIDATION_ERROR,
        400,
        { field }
      ));
    }
    
    next();
  };
};
