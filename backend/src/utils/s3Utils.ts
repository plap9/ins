import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { Readable } from 'stream';
import dotenv from 'dotenv';
import { redisClient } from '../config/redis'; 
import { fileTypeFromBuffer, fileTypeFromStream } from 'file-type';

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

interface UploadResult {
  Location: string;
  Key: string;
  ETag?: string;
  Bucket: string;
}

const detectContentType = async (data: Buffer | Readable): Promise<string> => {
    try {
      // Check if it's a Buffer
      if (Buffer.isBuffer(data)) {
        const type = await fileTypeFromBuffer(data);
        return type?.mime || 'application/octet-stream';
      } 
      // If it's not a Buffer, it must be a Readable
      else {
        const webStream = Readable.toWeb(data as Readable);
        const type = await fileTypeFromStream(webStream);
        return type?.mime || 'application/octet-stream';
      }
    } catch {
      return 'application/octet-stream';
    }
  };

export const uploadToS3 = async (
  filePath: string | Buffer,
  key?: string,
  contentType?: string
): Promise<UploadResult> => {
  try {
    let Body: Buffer | Readable;
    
    if (typeof filePath === 'string') {
      const { createReadStream } = await import('fs');
      Body = createReadStream(filePath);
    } else {
      Body = filePath;
    }

    const finalKey = key || `${uuidv4()}`;
    const detectedContentType = contentType || await detectContentType(Body);

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: finalKey,
      Body,
      ContentType: detectedContentType,
      ACL: 'private'
    });

    const result = await s3Client.send(command);
    
    await redisClient.setex(
      `s3:${finalKey}`,
      86400,
      JSON.stringify({
        key: finalKey,
        contentType: detectedContentType,
        size: Buffer.isBuffer(Body) ? Body.length : null
      })
    );

    return {
      Location: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${finalKey}`,
      Key: finalKey,
      ETag: result.ETag,
      Bucket: process.env.AWS_S3_BUCKET_NAME || ''
    };
  } catch (error) {
    throw new Error(`Upload to S3 failed: ${(error as Error).message}`);
  }
};

export const deleteFromS3 = async (key: string): Promise<void> => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key
    });

    await s3Client.send(command);
    await redisClient.del(`s3:${key}`);
  } catch (error) {
    throw new Error(`Delete from S3 failed: ${(error as Error).message}`);
  }
};

export const generatePresignedUrl = async (key: string, expiresIn = 3600): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    throw new Error(`Generate presigned URL failed: ${(error as Error).message}`);
  }
};

export const uploadResizedImage = async (
  buffer: Buffer,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: keyof sharp.FormatEnum;
  }
): Promise<UploadResult> => {
  try {
    const processedImage = sharp(buffer)
      .resize(options.width, options.height, { fit: 'contain' })
      .toFormat(options.format || 'jpeg')
      .jpeg({ quality: options.quality || 80 });

    const processedBuffer = await processedImage.toBuffer();
    
    return uploadToS3(
      processedBuffer,
      undefined,
      `image/${options.format || 'jpeg'}`
    );
  } catch (error) {
    throw new Error(`Image processing failed: ${(error as Error).message}`);
  }
};

export const getS3Metadata = async (key: string): Promise<any> => {
  try {
    const cached = await redisClient.get(`s3:${key}`);
    if (cached) return JSON.parse(cached);

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key
    });

    const response = await s3Client.send(command);
    
    const metadata = {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      metadata: response.Metadata
    };

    await redisClient.setex(`s3:${key}`, 3600, JSON.stringify(metadata));
    return metadata;
  } catch (error) {
    throw new Error(`Get S3 metadata failed: ${(error as Error).message}`);
  }
};