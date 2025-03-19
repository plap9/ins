import { S3Client } from "@aws-sdk/client-s3";
import multer, { FileFilterCallback } from "multer";
import multerS3 from "multer-s3";
import dotenv from "dotenv";
import path from "path";
import { Request } from "express";
import { AppError } from "./errorHandler";

dotenv.config();

const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const allowedTypes = ["jpg", "jpeg", "png", "mp4", "mov"];

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const fileExt = path.extname(file.originalname).toLowerCase().replace(".", "");
    if (allowedTypes.includes(fileExt)) {
        cb(null, true);
    } else {
        cb(new AppError("Chỉ hỗ trợ các định dạng JPG, JPEG, PNG, MP4, MOV", 400));
    }
};

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME!,
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
            const fileExt = path.extname(file.originalname);
            cb(null, `posts/${Date.now().toString()}${fileExt}`);
        },
    }),
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 }, 
});

export default upload;
