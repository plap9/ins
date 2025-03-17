import { Request, Response, NextFunction } from "express";
import { Schema } from "joi";
import ValidationService from "../services/ValidationService";

export const validate =
    (schema: Schema) => (req: Request, res: Response, next: NextFunction): void => {
        try {
            ValidationService.validateData(schema, req.body);
            next();
        } catch (error) {
            next(error);
        }
    };
