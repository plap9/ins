import { Request, Response, NextFunction } from "express";
import { Schema, ValidationError } from "joi";
import { AppError } from "../middlewares/errorHandler";
import { ErrorCode } from "../types/errorCode";

export const validate =
  (schema: Schema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    console.log("--- req.file ---"); 
    console.log(JSON.stringify(req.file, null, 2));
    console.log("-----------------");
    console.log("--- Request Headers ---");
    console.log("Content-Type:", req.headers["content-type"]);
    console.log("----------------------");

    console.log("--- Validating req.body ---");
    console.log(JSON.stringify(req.body, null, 2));
    console.log("---------------------------");
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map((err) => err.message);
      console.error("Validation Errors:", errors);
      return next(
        new AppError("Dữ liệu không hợp lệ", 400, ErrorCode.VALIDATION_ERROR)
      );
    }

    next();
  };
