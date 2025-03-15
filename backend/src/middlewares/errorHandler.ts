import { Request, Response, NextFunction } from "express";
import { QueryError } from "mysql2";
import { JsonWebTokenError, TokenExpiredError, NotBeforeError } from "jsonwebtoken";
import { MulterError } from "multer";
import { ValidationError } from "joi";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number) {
    super(message || "Có lỗi xảy ra"); 
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const logError = (err: any): void => {
  console.error(`[${new Date().toISOString()}] ERROR:`, {
    name: err.name,
    message: err.message,
    stack: err.stack,
    ...(err.code && { code: err.code }),
    ...(err.statusCode && { statusCode: err.statusCode })
  });
};

const handleMySQLError = (err: QueryError): AppError => {
  const errorMap: { [key: string]: { message: string; statusCode: number } } = {
    ER_DUP_ENTRY: { message: "Dữ liệu đã tồn tại trong hệ thống", statusCode: 409 },
    ER_NO_REFERENCED_ROW: { message: "Dữ liệu liên quan không tồn tại", statusCode: 400 },
    ER_ROW_IS_REFERENCED: { message: "Dữ liệu đang được sử dụng", statusCode: 400 },
    ER_PARSE_ERROR: { message: "Lỗi cú pháp SQL", statusCode: 500 },
    ECONNREFUSED: { message: "Không thể kết nối đến cơ sở dữ liệu", statusCode: 503 },
    PROTOCOL_CONNECTION_LOST: { message: "Kết nối cơ sở dữ liệu bị mất", statusCode: 503 },
  };

  return new AppError(errorMap[err.code]?.message || "Lỗi cơ sở dữ liệu", errorMap[err.code]?.statusCode || 500);
};

const handleJWTError = (err: JsonWebTokenError | TokenExpiredError | NotBeforeError): AppError => {
  const errorMap = {
    TokenExpiredError: { message: "Token đã hết hạn. Vui lòng đăng nhập lại", statusCode: 401 },
    NotBeforeError: { message: "Token chưa có hiệu lực", statusCode: 401 },
    JsonWebTokenError: { message: "Token không hợp lệ. Vui lòng đăng nhập lại", statusCode: 401 }
  } as const;

  return new AppError(
    errorMap[err.name as keyof typeof errorMap]?.message || "Lỗi xác thực token",
    errorMap[err.name as keyof typeof errorMap]?.statusCode || 401
  );
};

const handleMulterError = (err: MulterError): AppError => {
  const errorMap: { [key: string]: string } = {
    LIMIT_FILE_SIZE: "Kích thước file quá lớn",
    LIMIT_FILE_COUNT: "Số lượng file vượt quá giới hạn",
    LIMIT_UNEXPECTED_FILE: "Loại file không được hỗ trợ",
  };

  return new AppError(errorMap[err.code] || "Lỗi khi tải file lên", 400);
};

const handleValidationError = (err: ValidationError): AppError => {
  const message = err.details.map(detail => detail.message).join("; ");
  return new AppError(`Dữ liệu không hợp lệ: ${message}`, 400);
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  logError(err);
  
  let error = err;

  if (err.errno && err.sqlMessage) {
    error = handleMySQLError(err);
  } else if (err instanceof JsonWebTokenError || err instanceof TokenExpiredError || err instanceof NotBeforeError) {
    error = handleJWTError(err);
  } else if (err instanceof MulterError) {
    error = handleMulterError(err);
  } else if (err.isJoi === true) {
    error = handleValidationError(err);
  } else if (!(err instanceof AppError)) {
    error = new AppError(err.message || "Có lỗi xảy ra", 500);
  }

  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    error: process.env.NODE_ENV === "development" ? error.message : "Lỗi hệ thống",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    status: "error",
    statusCode
  });
};

export const catchAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  next(new AppError(`Không tìm thấy ${req.originalUrl} trên máy chủ này`, 404));
};
