import { Request, Response, NextFunction } from "express";
import { QueryError } from "mysql2";
import { JsonWebTokenError, TokenExpiredError, NotBeforeError } from "jsonwebtoken";
import { MulterError } from "multer";
import { ValidationError } from "joi";

export enum ErrorCode {
  MISSING_CREDENTIALS = "AUTH_001",
  INVALID_CREDENTIALS = "AUTH_002",
  ACCOUNT_NOT_FOUND = "AUTH_003",
  INVALID_PASSWORD = "AUTH_004",
  UNVERIFIED_ACCOUNT = "AUTH_005",
  INVALID_TOKEN = "AUTH_006",
  TOKEN_EXPIRED = "AUTH_007",
  TOO_MANY_ATTEMPTS = "AUTH_008",
  MISSING_TOKEN = "AUTH_009",
  EXISTING_USER = "AUTH_010",
  INVALID_FORMAT = "AUTH_011",
  INVALID_OTP = "AUTH_012",
  INVALID_VERIFICATION = "AUTH_013",
  
  DUPLICATE_ENTRY = "DB_001",
  REFERENCED_DATA_NOT_FOUND = "DB_002",
  DATA_IN_USE = "DB_003",
  DB_CONNECTION_ERROR = "DB_004",
  
  FILE_TOO_LARGE = "FILE_001",
  TOO_MANY_FILES = "FILE_002",
  UNSUPPORTED_FILE_TYPE = "FILE_003",
  
  VALIDATION_ERROR = "VAL_001",
  
  NOT_FOUND = "GEN_001",
  SERVER_ERROR = "GEN_002"
}

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  errorCode: ErrorCode;
  field?: string;
  
  constructor(message: string, statusCode: number, errorCode: ErrorCode, field?: string) {
    super(message || "Có lỗi xảy ra"); 
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errorCode = errorCode;
    this.field = field;
    Error.captureStackTrace(this, this.constructor);
  }
}

const logError = (err: any): void => {
  console.error(`[${new Date().toISOString()}] ERROR:`, {
    name: err.name,
    message: err.message,
    errorCode: err.errorCode,
    field: err.field,
    stack: err.stack,
    ...(err.code && { code: err.code }),
    ...(err.statusCode && { statusCode: err.statusCode })
  });
};

const handleMySQLError = (err: QueryError): AppError => {
  const errorMap: { [key: string]: { message: string; statusCode: number; errorCode: ErrorCode } } = {
    ER_DUP_ENTRY: { 
      message: "Dữ liệu đã tồn tại trong hệ thống", 
      statusCode: 409, 
      errorCode: ErrorCode.DUPLICATE_ENTRY 
    },
    ER_NO_REFERENCED_ROW: { 
      message: "Dữ liệu liên quan không tồn tại", 
      statusCode: 400, 
      errorCode: ErrorCode.REFERENCED_DATA_NOT_FOUND 
    },
    ER_ROW_IS_REFERENCED: { 
      message: "Dữ liệu đang được sử dụng", 
      statusCode: 400, 
      errorCode: ErrorCode.DATA_IN_USE 
    },
    ER_PARSE_ERROR: { 
      message: "Lỗi cú pháp SQL", 
      statusCode: 500, 
      errorCode: ErrorCode.SERVER_ERROR 
    },
    ECONNREFUSED: { 
      message: "Không thể kết nối đến cơ sở dữ liệu", 
      statusCode: 503, 
      errorCode: ErrorCode.DB_CONNECTION_ERROR 
    },
    PROTOCOL_CONNECTION_LOST: { 
      message: "Kết nối cơ sở dữ liệu bị mất", 
      statusCode: 503, 
      errorCode: ErrorCode.DB_CONNECTION_ERROR 
    },
  };

  const defaultError = { message: "Lỗi cơ sở dữ liệu", statusCode: 500, errorCode: ErrorCode.SERVER_ERROR };
  const error = errorMap[err.code] || defaultError;
  
  let field;
  if (err.code === 'ER_DUP_ENTRY' && err.message) {
    const matches = err.message.match(/'([^']+)'/g);
    if (matches && matches.length > 1) {
      const key = matches[1].replace(/'/g, '');
      field = key.includes('email') ? 'email' : 
              key.includes('phone') ? 'phone_number' : 
              key.includes('username') ? 'username' : undefined;
    }
  }

  return new AppError(error.message, error.statusCode, error.errorCode, field);
};

const handleJWTError = (err: JsonWebTokenError | TokenExpiredError | NotBeforeError): AppError => {
  const errorMap = {
    TokenExpiredError: { 
      message: "Token đã hết hạn. Vui lòng đăng nhập lại", 
      statusCode: 401, 
      errorCode: ErrorCode.TOKEN_EXPIRED 
    },
    NotBeforeError: { 
      message: "Token chưa có hiệu lực", 
      statusCode: 401, 
      errorCode: ErrorCode.INVALID_TOKEN 
    },
    JsonWebTokenError: { 
      message: "Token không hợp lệ. Vui lòng đăng nhập lại", 
      statusCode: 401, 
      errorCode: ErrorCode.INVALID_TOKEN 
    }
  } as const;

  const defaultError = { 
    message: "Lỗi xác thực token", 
    statusCode: 401, 
    errorCode: ErrorCode.INVALID_TOKEN 
  };
  const error = errorMap[err.name as keyof typeof errorMap] || defaultError;

  return new AppError(error.message, error.statusCode, error.errorCode);
};

const handleMulterError = (err: MulterError): AppError => {
  const errorMap: { [key: string]: { message: string; errorCode: ErrorCode; field?: string } } = {
    LIMIT_FILE_SIZE: { 
      message: "Kích thước file quá lớn", 
      errorCode: ErrorCode.FILE_TOO_LARGE,
      field: 'file'
    },
    LIMIT_FILE_COUNT: { 
      message: "Số lượng file vượt quá giới hạn", 
      errorCode: ErrorCode.TOO_MANY_FILES 
    },
    LIMIT_UNEXPECTED_FILE: { 
      message: "Loại file không được hỗ trợ", 
      errorCode: ErrorCode.UNSUPPORTED_FILE_TYPE,
      field: 'file'
    },
  };

  const defaultError = { 
    message: "Lỗi khi tải file lên", 
    errorCode: ErrorCode.SERVER_ERROR 
  };
  const error = errorMap[err.code] || defaultError;

  return new AppError(error.message, 400, error.errorCode, error.field);
};

const handleValidationError = (err: ValidationError): AppError => {
  const detail = err.details[0]; 
  const message = detail.message;
  const field = detail.path.join('.');
  
  return new AppError(`Dữ liệu không hợp lệ: ${message}`, 400, ErrorCode.VALIDATION_ERROR, field);
};

export const mapAuthError = (message: string, statusCode: number): AppError => {
  const errorMap: { [key: string]: { errorCode: ErrorCode; field?: string } } = {
    "Vui lòng nhập đầy đủ thông tin": { 
      errorCode: ErrorCode.MISSING_CREDENTIALS,
    },
    "Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau": { 
      errorCode: ErrorCode.TOO_MANY_ATTEMPTS,
      field: 'login'
    },
    "Tài khoản không tồn tại": { 
      errorCode: ErrorCode.ACCOUNT_NOT_FOUND,
      field: 'login'
    },
    "Tài khoản chưa được xác thực": { 
      errorCode: ErrorCode.UNVERIFIED_ACCOUNT,
      field: 'login'
    },
    "Sai mật khẩu": { 
      errorCode: ErrorCode.INVALID_PASSWORD,
      field: 'password'
    },
    "Thiếu token": { 
      errorCode: ErrorCode.MISSING_TOKEN
    },
    "Token không hợp lệ": { 
      errorCode: ErrorCode.INVALID_TOKEN
    },
    "Email hoặc số điện thoại đã tồn tại": { 
      errorCode: ErrorCode.EXISTING_USER,
      field: 'contact'
    },
    "Định dạng email hoặc số điện thoại không hợp lệ": { 
      errorCode: ErrorCode.INVALID_FORMAT,
      field: 'contact'
    },
    "Quá nhiều lần đăng ký, vui lòng thử lại sau": { 
      errorCode: ErrorCode.TOO_MANY_ATTEMPTS
    },
    "Thiếu token xác thực": { 
      errorCode: ErrorCode.MISSING_TOKEN
    },
    "Token không hợp lệ hoặc đã hết hạn": { 
      errorCode: ErrorCode.INVALID_VERIFICATION
    },
    "Thiếu số điện thoại hoặc mã OTP": { 
      errorCode: ErrorCode.MISSING_CREDENTIALS
    },
    "Mã OTP không hợp lệ hoặc đã hết hạn": { 
      errorCode: ErrorCode.INVALID_OTP,
      field: 'otp'
    },
    "Không có refresh token": { 
      errorCode: ErrorCode.MISSING_TOKEN
    }
  };

  if (message === "Vui lòng nhập đầy đủ thông tin") {
    const field = message.toLowerCase().includes('password') ? 'password' : 
                 message.toLowerCase().includes('email') ? 'email' : 
                 message.toLowerCase().includes('phone') ? 'phone_number' : 
                 'login';
    return new AppError(message, statusCode, ErrorCode.MISSING_CREDENTIALS, field);
  }

  const error = errorMap[message];
  return error 
    ? new AppError(message, statusCode, error.errorCode, error.field)
    : new AppError(message, statusCode, ErrorCode.SERVER_ERROR);
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  logError(err);
  
  let error = err;

  if (err instanceof AppError && !err.errorCode) {
    error = mapAuthError(err.message, err.statusCode);
  } else if (err.errno && err.sqlMessage) {
    error = handleMySQLError(err);
  } else if (err instanceof JsonWebTokenError || err instanceof TokenExpiredError || err instanceof NotBeforeError) {
    error = handleJWTError(err);
  } else if (err instanceof MulterError) {
    error = handleMulterError(err);
  } else if (err.isJoi === true) {
    error = handleValidationError(err);
  } else if (!(err instanceof AppError)) {
    error = new AppError(err.message || "Có lỗi xảy ra", 500, ErrorCode.SERVER_ERROR);
  }

  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    error: process.env.NODE_ENV === "development" ? error.message : "Lỗi hệ thống",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    status: "error",
    statusCode,
    errorCode: error.errorCode,
    field: error.field
  });
};

export const catchAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  next(new AppError(`Không tìm thấy ${req.originalUrl} trên máy chủ này`, 404, ErrorCode.NOT_FOUND));
};