import multer, { FileFilterCallback } from "multer";
import path from "path";
import { Request } from "express";
import { AppError } from "./errorHandler";
import { ErrorCode } from "../types/errorCode";

export const FileTypes = {
  IMAGE: ["jpg", "jpeg", "png", "gif", "webp"],
  VIDEO: ["mp4", "mov", "avi", "webm"],
  AVATAR: ["jpg", "jpeg", "png"],
  POST: ["jpg", "jpeg", "png", "mp4", "mov"]
};

export const FileSizeLimits = {
  AVATAR: 5 * 1024 * 1024,
  POST_IMAGE: 10 * 1024 * 1024,
  POST_VIDEO: 50 * 1024 * 1024,
} as const;

export const ImageResizeConfig = {
  AVATAR: {
    width: 400,
    height: 400,
    quality: 80,
    format: 'jpeg' as const
  },
  POST_THUMBNAIL: {
    width: 600,
    height: 600,
    quality: 80,
    format: 'jpeg' as const
  },
  STORY_IMAGE: {
    width: 1080,
    height: 1920,
    quality: 85,
    format: 'jpeg' as const
  }
} as const;

export const createFileFilter = (allowedTypes: string[]) => {
  return (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const fileExt = path.extname(file.originalname).toLowerCase().replace(".", "");
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          `Chỉ hỗ trợ các định dạng: ${allowedTypes.join(", ")}`,
          400,
          ErrorCode.UNSUPPORTED_FILE_TYPE
        )
      );
    }
  };
};

export const createUploadMiddleware = (
  fieldName: string,
  allowedTypes: string[],
  maxSize: number,
  maxCount?: number
) => {
  return multer({
    storage: multer.memoryStorage(),
    fileFilter: createFileFilter(allowedTypes),
    limits: { fileSize: maxSize }
  }).array(fieldName, maxCount || 10);
};

export const uploadAvatar = createUploadMiddleware(
  'avatar',
  [...FileTypes.AVATAR],
  FileSizeLimits.AVATAR
);

export const uploadPostMedia = createUploadMiddleware(
  'media',
  [...FileTypes.POST],
  FileSizeLimits.POST_VIDEO,
  10
);

export default {
  uploadAvatar,
  uploadPostMedia
};