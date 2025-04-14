    import multer, { FileFilterCallback } from "multer";
    import path from "path";
    import { Request } from "express";
    import { AppException } from "./errorHandler";
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
        
        const mimeType = file.mimetype.split('/')[1];
        if (allowedTypes.includes(mimeType)) {
          cb(null, true);
          return;
        }
        
        const fileExt = path.extname(file.originalname).toLowerCase().replace(".", "");
        if (allowedTypes.includes(fileExt)) {
          cb(null, true);
        } else {
          cb(
            new AppException(
              `Chỉ hỗ trợ các định dạng: ${allowedTypes.join(", ")}`,
              ErrorCode.UNSUPPORTED_FILE_TYPE,
              400
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
      const multerInstance = multer({
        storage: multer.memoryStorage(),
        fileFilter: createFileFilter(allowedTypes),
        limits: { fileSize: maxSize }
      });
      
      if (maxCount && maxCount > 1) {
        return multerInstance.array(fieldName, maxCount);
      } else {
        return multerInstance.single(fieldName);
      }
    };

    export const uploadAvatar = (req: Request, res: any, next: any) => {
      if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
        
        if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
          return next();
        }
      }
      
      const upload = createUploadMiddleware(
        'avatar',
        [...FileTypes.AVATAR],
        FileSizeLimits.AVATAR
      );
      
      upload(req, res, (err: any) => {
        if (err) {
          console.error(`[upload] Lỗi khi xử lý upload avatar: ${err.message}`, err);
          console.error(`[upload] Chi tiết lỗi:`, err.stack || err);
          
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return next(new AppException(`File quá lớn, giới hạn: ${FileSizeLimits.AVATAR / (1024 * 1024)}MB`, ErrorCode.FILE_TOO_LARGE, 400));
            }
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
              return next(new AppException('Tên field không đúng. Phải sử dụng field "avatar"', ErrorCode.UNSUPPORTED_FILE_TYPE, 400));
            }
          }
          
          return next(new AppException(`Lỗi khi upload file: ${err.message}`, ErrorCode.FILE_PROCESSING_ERROR, 400));
        }
        
        if (!req.file) {
          
          if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
            console.error(`[upload] Có Content-Type: multipart/form-data nhưng không có file`);
            
            return next();
          }
        } else {
        }
        
        next();
      });
    };

    export const uploadPostMedia = createUploadMiddleware(
      'media',
      [...FileTypes.POST],
      FileSizeLimits.POST_VIDEO,
      10
    );

    export const uploadStoryMedia = createUploadMiddleware(
      'media',
      [...FileTypes.POST],
      FileSizeLimits.POST_VIDEO,
      1
    );

    export const uploadMessageMedia = createUploadMiddleware(
      'media',
      [...FileTypes.IMAGE, ...FileTypes.VIDEO],
      FileSizeLimits.POST_VIDEO,
      1
    );

    export default {
      uploadAvatar,
      uploadPostMedia,
      uploadStoryMedia,
      uploadMessageMedia
    };