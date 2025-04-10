import { Request, Response, NextFunction } from "express";
import { QueryError } from "mysql2";
import {
  JsonWebTokenError,
  TokenExpiredError,
  NotBeforeError,
} from "jsonwebtoken";
import { MulterError } from "multer";
import { ValidationError } from "joi";
import { ErrorCode } from "../types/errorCode";
import { createAppError, logError } from '../utils/errorUtils';

export interface AppError {
  code: ErrorCode;
  message: string;
  status?: number;
  data?: Record<string, any>;
}

export class AppException extends Error {
  code: ErrorCode;
  status: number;
  data?: Record<string, any>;

  constructor(message: string, code: ErrorCode, status = 500, data?: Record<string, any>) {
    super(message);
    this.name = 'AppException';
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

const errorCodeToStatus: Record<string, number> = {
  'AUTH_001': 401, // MISSING_CREDENTIALS 
  'AUTH_002': 401, // INVALID_CREDENTIALS
  'AUTH_003': 404, // ACCOUNT_NOT_FOUND
  'AUTH_004': 401, // INVALID_PASSWORD
  'AUTH_005': 403, // UNVERIFIED_ACCOUNT
  'AUTH_006': 401, // INVALID_TOKEN
  'AUTH_007': 401, // TOKEN_EXPIRED
  'AUTH_008': 429, // TOO_MANY_ATTEMPTS
  'AUTH_009': 401, // MISSING_TOKEN
  'AUTH_010': 409, // EXISTING_USER
  'AUTH_011': 400, // INVALID_FORMAT
  'AUTH_012': 400, // INVALID_OTP
  'AUTH_013': 400, // INVALID_VERIFICATION
  
  'DB_001': 409, // DUPLICATE_ENTRY
  'DB_002': 404, // REFERENCED_DATA_NOT_FOUND
  'DB_003': 409, // DATA_IN_USE
  'DB_004': 500, // DB_CONNECTION_ERROR

  'FILE_001': 413, // FILE_TOO_LARGE
  'FILE_002': 429, // TOO_MANY_FILES
  'FILE_003': 415, // UNSUPPORTED_FILE_TYPE
  'FILE_004': 500, // FILE_DOWNLOAD_ERROR
  'FILE_005': 500, // FILE_PROCESSING_ERROR
  'FILE_006': 404, // FILE_MISSING
  'FILE_007': 500, // UPLOAD_FAILED
  'FILE_008': 500, // CANCEL_FAILED
  'FILE_009': 400, // CHUNK_INVALID
  
  'MEDIA_001': 404, // MEDIA_NOT_FOUND
  'MEDIA_002': 500, // MEDIA_PROCESSING_ERROR
  'MEDIA_003': 415, // UNSUPPORTED_MEDIA_TYPE
  'MEDIA_004': 400, // MISSING_MEDIA_URL
  'MEDIA_005': 500, // MEDIA_UPLOAD_ERROR
  'MEDIA_006': 400, // MISSING_EDIT_DATA
  'MEDIA_007': 415, // MEDIA_UNSUPPORTED_TYPE
  
  'VAL_001': 400, // VALIDATION_ERROR

  'GEN_001': 404, // NOT_FOUND
  'GEN_002': 500, // SERVER_ERROR
  'GEN_003': 403, // RESOURCE_ACCESS_DENIED
  'GEN_004': 400, // INVALID_OPERATION
  'GEN_005': 429, // RATE_LIMIT_EXCEEDED
  'GEN_006': 403, // INVALID_PERMISSIONS
};

const handleMySQLError = (err: QueryError): AppException => {
  if (err.code === "ER_DUP_ENTRY") {
    return new AppException(
      "Dữ liệu đã tồn tại trong hệ thống",
      ErrorCode.DUPLICATE_ENTRY,
      409
    );
  }
  
  if (err.code === "ER_NO_REFERENCED_ROW") {
    return new AppException(
      "Dữ liệu liên quan không tồn tại",
      ErrorCode.REFERENCED_DATA_NOT_FOUND,
      400
    );
  }
  
  if (err.code === "ER_ROW_IS_REFERENCED") {
    return new AppException(
      "Dữ liệu đang được sử dụng",
      ErrorCode.DATA_IN_USE,
      400
    );
  }
  
  return new AppException(
    "Lỗi cơ sở dữ liệu",
    ErrorCode.SERVER_ERROR,
    500
  );
};

const handleJWTError = (err: JsonWebTokenError | TokenExpiredError | NotBeforeError): AppException => {
  if (err instanceof TokenExpiredError) {
    return new AppException(
      "Token đã hết hạn. Vui lòng đăng nhập lại",
      ErrorCode.TOKEN_EXPIRED,
      401
    );
  }
  
  if (err instanceof NotBeforeError) {
    return new AppException(
      "Token chưa có hiệu lực",
      ErrorCode.INVALID_TOKEN,
      401
    );
  }
  
  return new AppException(
    "Token không hợp lệ. Vui lòng đăng nhập lại",
    ErrorCode.INVALID_TOKEN,
    401
  );
};

const handleMulterError = (err: MulterError): AppException => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return new AppException(
      "Kích thước file quá lớn",
      ErrorCode.FILE_TOO_LARGE,
      400,
      { field: "file" }
    );
  }
  
  if (err.code === "LIMIT_FILE_COUNT") {
    return new AppException(
      "Số lượng file vượt quá giới hạn",
      ErrorCode.TOO_MANY_FILES,
      400
    );
  }
  
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return new AppException(
      "Loại file không được hỗ trợ",
      ErrorCode.UNSUPPORTED_FILE_TYPE,
      400,
      { field: "file" }
    );
  }
  
  return new AppException(
    "Lỗi khi tải file lên",
    ErrorCode.SERVER_ERROR,
    400
  );
};

const handleValidationError = (err: ValidationError): AppException => {
  const detail = err.details[0];
  const message = detail.message;
  const field = detail.path.join(".");
  
  return new AppException(
    `Dữ liệu không hợp lệ: ${message}`,
    ErrorCode.VALIDATION_ERROR,
    400,
    { field }
  );
};

export const appExceptionHandler = (
  err: AppException, 
  req: Request,
  res: Response, 
  next: NextFunction
) => {
  const statusCode = err.status || errorCodeToStatus[err.code] || 500;
  
  logError('Express', err, `Route: ${req.method} ${req.path}`);
  
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code,
      message: err.message,
      data: err.data
    }
  });
};

export const globalErrorHandler = (
  err: Error | unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppException) {
    return appExceptionHandler(err, req, res, next);
  }
  
  let error: AppException;
  
  if (err instanceof Error) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err.name === 'NotBeforeError') {
      error = handleJWTError(err as any);
    } else if (err instanceof MulterError) {
      error = handleMulterError(err);
    } else if ('isJoi' in err && (err as any).isJoi === true) {
      error = handleValidationError(err as any);
    } else if ((err as any).errno && (err as any).sqlMessage) {
      error = handleMySQLError(err as any);
    } else {
      const message = err.message || '';
      
      if (message.includes("fetch")) {
        error = new AppException(
          "Không thể tải xuống media từ URL",
          ErrorCode.FILE_DOWNLOAD_ERROR,
          400,
          { field: "mediaUrl" }
        );
      } else if (message.includes("sharp")) {
        error = new AppException(
          "Lỗi khi xử lý hình ảnh",
          ErrorCode.MEDIA_PROCESSING_ERROR,
          500
        );
      } else if (message.includes("ffmpeg")) {
        error = new AppException(
          "Lỗi khi xử lý video",
          ErrorCode.MEDIA_PROCESSING_ERROR,
          500
        );
      } else {
        error = new AppException(
          message || "Có lỗi xảy ra",
          ErrorCode.SERVER_ERROR,
          500
        );
      }
    }
  } else {
    const appError = createAppError(err);
    error = new AppException(
      appError.message,
      appError.code,
      errorCodeToStatus[appError.code] || 500,
      appError.data
    );
  }
  
  return appExceptionHandler(error, req, res, next);
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppException(
    `Không tìm thấy đường dẫn: ${req.method} ${req.path}`,
    ErrorCode.NOT_FOUND,
    404,
    { path: req.originalUrl }
  );
  
  logError('Express', error, `Route không tồn tại: ${req.method} ${req.path}`);
  
  res.status(404).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      data: error.data
    }
  });
};

export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};


