import { Schema, ValidationError } from "joi";
import { AppError } from "../middlewares/errorHandler";

class ValidationService {
    public static validateData(schema: Schema, data: any): void {
        const { error } = schema.validate(data, { abortEarly: false });

        if (error) {
            const errors = error.details.map((err) => err.message).join(", ");
            throw new AppError(`Dữ liệu không hợp lệ: ${errors}`, 400);
        }
    }
}

export default ValidationService;
