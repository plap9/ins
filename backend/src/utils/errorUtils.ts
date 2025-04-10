import { ErrorCode } from '../types/errorCode';
import { Socket } from 'socket.io';
import { AppException } from '../middlewares/errorHandler';
import { Request, Response, NextFunction } from 'express';

export interface AppError {
  code: ErrorCode;
  message: string;
  originalError?: Error | unknown;
  timestamp: string;
  data?: Record<string, any>;
}

export function createAppError(
  error: unknown, 
  defaultCode: ErrorCode = ErrorCode.SERVER_ERROR, 
  defaultMessage: string = 'Lỗi hệ thống',
  additionalData?: Record<string, any>
): AppError {
  const timestamp = new Date().toISOString();
  
  if (error instanceof AppException) {
    return {
      code: error.code,
      message: error.message,
      originalError: error,
      timestamp,
      data: {
        ...error.data,
        ...additionalData
      }
    };
  }
  
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    return {
      code: (error as any).code,
      message: (error as any).message,
      originalError: error,
      timestamp,
      data: { 
        ...(error as any).data,
        ...additionalData
      }
    };
  }
  
  if (error instanceof Error) {
    return {
      code: defaultCode,
      message: error.message || defaultMessage,
      originalError: error,
      timestamp,
      data: additionalData
    };
  }
  
  return {
    code: defaultCode,
    message: typeof error === 'string' ? error : defaultMessage,
    originalError: error,
    timestamp,
    data: additionalData
  };
}

export function logError(
  scope: string,
  error: unknown,
  additionalInfo?: string
): void {
  const appError = createAppError(error);
  const errorInfo = additionalInfo ? `- ${additionalInfo}` : '';
  
  console.error(
    `[${appError.timestamp}] [${scope}] [${appError.code}] ${appError.message} ${errorInfo}`,
    appError.originalError instanceof Error ? appError.originalError.stack : ''
  );
}

export function emitErrorToClient(
  socket: Socket,
  error: unknown,
  defaultCode: ErrorCode = ErrorCode.SERVER_ERROR,
  defaultMessage: string = 'Lỗi hệ thống'
): void {
  const appError = createAppError(error, defaultCode, defaultMessage);
  
  socket.emit('error', {
    code: appError.code,
    message: appError.message,
    timestamp: appError.timestamp,
    data: appError.data
  });
  
  logError('socket', error, `Đã gửi lỗi tới client ${socket.id}`);
}

export function extractErrorInfo(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error && typeof error === 'object') {
    return JSON.stringify(error);
  }
  
  return String(error);
}

export async function handleAsyncError<T>(
  promise: Promise<T>,
  scope: string
): Promise<[T | null, AppError | null]> {
  try {
    const result = await promise;
    return [result, null];
  } catch (error) {
    const appError = createAppError(error);
    logError(scope, error);
    return [null, appError];
  }
}

export function isErrorCode(error: unknown, code: ErrorCode): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as any).code === code;
  }
  return false;
}

export function controllerErrorHandler(error: unknown, scope: string, req: Request, next: NextFunction): void {
  if (error instanceof AppException) {
    next(error);
    return;
  }
  
  if (error && typeof error === 'object' && 'sqlMessage' in error && 'errno' in error) {
    const dbError = error as { sqlMessage: string, code?: string, errno: number };
    
    let dbErrorType = ErrorCode.SERVER_ERROR;
    let status = 500;
    let message = 'Lỗi cơ sở dữ liệu';
    let field: string | undefined;
    
    if (dbError.code === 'ER_DUP_ENTRY') {
      dbErrorType = ErrorCode.DUPLICATE_ENTRY;
      status = 409;
      message = 'Dữ liệu đã tồn tại';
      
      const matches = dbError.sqlMessage.match(/'([^']+)'/g);
      if (matches && matches.length > 1) {
        const key = matches[1].replace(/'/g, "");
        field = key.includes("email") ? "email" :
                key.includes("phone") ? "phone_number" :
                key.includes("username") ? "username" : undefined;
      }
    }
    
    if (dbError.code === 'ER_NO_REFERENCED_ROW') {
      dbErrorType = ErrorCode.REFERENCED_DATA_NOT_FOUND;
      status = 400;
      message = 'Dữ liệu liên quan không tồn tại';
    }
    
    if (dbError.code === 'ER_ROW_IS_REFERENCED') {
      dbErrorType = ErrorCode.DATA_IN_USE;
      status = 400;
      message = 'Dữ liệu đang được sử dụng';
    }
    
    logError(scope, error, `Database error: ${dbError.sqlMessage}`);
    next(new AppException(message, dbErrorType, status, field ? { field } : undefined));
    return;
  }
  
  logError(scope, error, `Lỗi không xác định trong controller ${scope}`);
  
  next(new AppException(
    error instanceof Error ? error.message : 'Lỗi hệ thống',
    ErrorCode.SERVER_ERROR,
    500
  ));
}

export function createController(controllerFn: (req: Request, res: Response, next: NextFunction) => Promise<void>, scope: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await controllerFn(req, res, next);
    } catch (error) {
      controllerErrorHandler(error, scope, req, next);
    }
  };
} 