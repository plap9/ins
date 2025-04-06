import axios from 'axios';
import { ErrorCode } from "@backend-types/errorCode";

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.MISSING_CREDENTIALS]: "Vui lòng nhập đầy đủ thông tin",
  [ErrorCode.INVALID_CREDENTIALS]: "Thông tin đăng nhập không chính xác",
  [ErrorCode.ACCOUNT_NOT_FOUND]: "Tài khoản không tồn tại",
  [ErrorCode.INVALID_PASSWORD]: "Mật khẩu không chính xác",
  [ErrorCode.UNVERIFIED_ACCOUNT]: "Tài khoản chưa được xác thực",
  [ErrorCode.INVALID_TOKEN]: "Token không hợp lệ",
  [ErrorCode.TOKEN_EXPIRED]: "Token đã hết hạn",
  [ErrorCode.TOO_MANY_ATTEMPTS]: "Quá nhiều lần thử",
  [ErrorCode.MISSING_TOKEN]: "Thiếu token xác thực",
  [ErrorCode.EXISTING_USER]: "Người dùng đã tồn tại",
  [ErrorCode.INVALID_FORMAT]: "Định dạng không hợp lệ",
  [ErrorCode.INVALID_OTP]: "Mã OTP không hợp lệ",
  [ErrorCode.INVALID_VERIFICATION]: "Xác thực không hợp lệ",

  // Database Errors
  [ErrorCode.DUPLICATE_ENTRY]: "Dữ liệu trùng lặp",
  [ErrorCode.REFERENCED_DATA_NOT_FOUND]: "Thiếu dữ liệu liên quan",
  [ErrorCode.DATA_IN_USE]: "Dữ liệu đang được sử dụng",
  [ErrorCode.DB_CONNECTION_ERROR]: "Lỗi kết nối database",

  // File Errors
  [ErrorCode.FILE_TOO_LARGE]: "File quá lớn",
  [ErrorCode.TOO_MANY_FILES]: "Quá nhiều file",
  [ErrorCode.UNSUPPORTED_FILE_TYPE]: "Loại file không hỗ trợ",
  [ErrorCode.FILE_DOWNLOAD_ERROR]: "Lỗi tải file",
  [ErrorCode.FILE_PROCESSING_ERROR]: "Lỗi xử lý file",
  [ErrorCode.FILE_MISSING]: "File không tồn tại",

  // Validation Errors
  [ErrorCode.VALIDATION_ERROR]: "Dữ liệu không hợp lệ",

  // Media Errors
  [ErrorCode.MEDIA_NOT_FOUND]: "Không tìm thấy media",
  [ErrorCode.MEDIA_PROCESSING_ERROR]: "Lỗi xử lý media",
  [ErrorCode.UNSUPPORTED_MEDIA_TYPE]: "Loại media không hỗ trợ",
  [ErrorCode.MISSING_MEDIA_URL]: "Thiếu URL media",
  [ErrorCode.MEDIA_UPLOAD_ERROR]: "Lỗi upload media",
  [ErrorCode.MISSING_EDIT_DATA]: "Thiếu dữ liệu chỉnh sửa",
  [ErrorCode.MEDIA_UNSUPPORTED_TYPE]: "Loại media không được hỗ trợ",

  // General Errors
  [ErrorCode.NOT_FOUND]: "Không tìm thấy",
  [ErrorCode.SERVER_ERROR]: "Lỗi server",
  [ErrorCode.RESOURCE_ACCESS_DENIED]: "Truy cập bị từ chối",
  [ErrorCode.INVALID_OPERATION]: "Thao tác không hợp lệ",
  [ErrorCode.RATE_LIMIT_EXCEEDED]: "Vượt quá giới hạn",
  [ErrorCode.INVALID_PERMISSIONS]: "Không có quyền truy cập",

  // Story Errors
  [ErrorCode.STORY_NOT_FOUND]: "Không tìm thấy story",
  [ErrorCode.STORY_EXPIRED]: "Story đã hết hạn",
  [ErrorCode.STORY_NO_MEDIA]: "Story thiếu media",
  [ErrorCode.STORY_ACCESS_DENIED]: "Không có quyền truy cập story",
  [ErrorCode.STORY_ALREADY_ADDED]: "Story đã được thêm",
  [ErrorCode.STORY_INVALID_CONTENT]: "Nội dung story không hợp lệ",
  [ErrorCode.STORY_MEDIA_UNSUPPORTED]: "Loại media story không hỗ trợ",

  // User Errors
  [ErrorCode.USER_NOT_FOUND]: "Không tìm thấy người dùng",
  [ErrorCode.USER_SETTINGS_NOT_FOUND]: "Không tìm thấy cài đặt",
  [ErrorCode.USER_NO_UPDATE_DATA]: "Không có dữ liệu cập nhật",
  [ErrorCode.USER_PROFILE_ACCESS_DENIED]: "Không có quyền truy cập profile",
  [ErrorCode.USER_SEARCH_INVALID]: "Tìm kiếm không hợp lệ",
  [ErrorCode.USER_NOT_AUTHENTICATED]: "Chưa xác thực",
};

export const getErrorMessage = (
  errorCode: ErrorCode,
  field?: string
): string => {
  const message = ERROR_MESSAGES[errorCode] || "Lỗi hệ thống";
  return field ? `${message} (${field})` : message;
};

export const handleApiError = (error: unknown): {
  code: ErrorCode;
  message: string;
  field?: string;
} => {
  const axiosError = error as any;
  
  if (!axiosError.response) {
    return {
      code: ErrorCode.SERVER_ERROR,
      message: "Không thể kết nối đến máy chủ",
    };
  }

  const responseData = axiosError.response.data as {
    errorCode?: ErrorCode;
    message?: string;
    field?: string;
  };

  return {
    code: responseData.errorCode || ErrorCode.SERVER_ERROR,
    message: responseData.message || getErrorMessage(responseData.errorCode || ErrorCode.SERVER_ERROR),
    field: responseData.field,
  };
};

export type HandledError = ReturnType<typeof handleApiError>;