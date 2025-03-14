import { Request, Response, NextFunction } from "express";
import { QueryError } from "mysql2";
import { JsonWebTokenError, TokenExpiredError, NotBeforeError } from "jsonwebtoken";
import { MulterError } from "multer";
import { ValidationError } from "joi";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number) {
    super(message);
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
  if (err.code === 'ER_DUP_ENTRY') {
    return new AppError('Dữ liệu đã tồn tại trong hệ thống', 409);
  }
  
  if (err.code === 'ER_NO_REFERENCED_ROW' || err.code === 'ER_ROW_IS_REFERENCED') {
    return new AppError('Dữ liệu liên quan không tồn tại hoặc đang được sử dụng', 400);
  }
  
  if (err.code === 'ER_PARSE_ERROR') {
    return new AppError('Lỗi cú pháp SQL', 500);
  }
  
  if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
    return new AppError('Không thể kết nối đến cơ sở dữ liệu', 503);
  }
  
  return new AppError('Lỗi cơ sở dữ liệu', 500);
};

const handleJWTError = (err: JsonWebTokenError | TokenExpiredError | NotBeforeError): AppError => {
  if (err instanceof TokenExpiredError) {
    return new AppError('Token đã hết hạn. Vui lòng đăng nhập lại', 401);
  }
  
  if (err instanceof NotBeforeError) {
    return new AppError('Token chưa có hiệu lực', 401);
  }
  
  return new AppError('Token không hợp lệ. Vui lòng đăng nhập lại', 401);
};

const handleMulterError = (err: MulterError): AppError => {
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      return new AppError('Kích thước file quá lớn', 400);
    case 'LIMIT_FILE_COUNT':
      return new AppError('Số lượng file vượt quá giới hạn', 400);
    case 'LIMIT_UNEXPECTED_FILE':
      return new AppError('Loại file không được hỗ trợ', 400);
    default:
      return new AppError('Lỗi khi tải file lên', 400);
  }
};

const handleValidationError = (err: ValidationError): AppError => {
  const message = err.details.map(detail => detail.message).join('; ');
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
  } else if (!err.statusCode) {
    error = new AppError(err.message || 'Có lỗi xảy ra', 500);
  }
  
  const statusCode = error.statusCode || 500;
  
  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({
      error: error.message,
      stack: error.stack,
      ...(error.code && { code: error.code }),
      status: 'error',
      statusCode
    });
    return;
  }
  
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Lỗi hệ thống' : error.message,
    status: 'error'
  });
};

export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Không tìm thấy ${req.originalUrl} trên máy chủ này`, 404);
  next(error);
};