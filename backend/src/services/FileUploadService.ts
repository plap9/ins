import multer, { FileFilterCallback } from "multer";
import multerS3 from "multer-s3";
import path from "path";
import { Request } from "express";
import { AppError } from "../middlewares/errorHandler";
import S3Service from "./S3Service";

class FileUploadService {
    private static allowedTypes = ["jpg", "jpeg", "png", "mp4", "mov"];

    private static fileFilter(req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
        const fileExt = path.extname(file.originalname).toLowerCase().replace(".", "");
        if (this.allowedTypes.includes(fileExt)) {
            cb(null, true);
        } else {
            cb(new AppError("Chỉ hỗ trợ các định dạng JPG, JPEG, PNG, MP4, MOV", 400));
        }
    }

    public static upload = multer({
        storage: multerS3({
            s3: S3Service.s3,
            bucket: process.env.AWS_S3_BUCKET_NAME!,
            metadata: (req, file, cb) => {
                cb(null, { fieldName: file.fieldname });
            },
            key: (req, file, cb) => {
                const fileExt = path.extname(file.originalname);
                cb(null, `posts/${Date.now().toString()}${fileExt}`);
            },
        }),
        fileFilter: this.fileFilter,
        limits: { fileSize: 50 * 1024 * 1024 }, 
    });
}

export default FileUploadService;
