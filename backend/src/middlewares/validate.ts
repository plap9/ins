import { Request, Response, NextFunction } from "express";
import { Schema } from "joi";

export const validate = (schema: Schema) => 
    (req: Request, res: Response, next: NextFunction): void => {
        const { error } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            const errors = error.details.map((err) => err.message);
            res.status(400).json({ error: "Dữ liệu không hợp lệ", details: errors });
            return;
        }

        next();
    };

