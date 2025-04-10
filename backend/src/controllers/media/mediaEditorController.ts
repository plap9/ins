import { NextFunction, Response } from "express";
import { AuthRequest } from "../../middlewares/authMiddleware";
import { AppException } from "../../middlewares/errorHandler";
import { ErrorCode } from "../../types/errorCode";
import pool from "../../config/db";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { uploadToS3 } from "../../utils/s3Utils";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

interface MediaEditRequest {
  originalMediaId?: number;
  mediaUrl?: string;
  edits: {
    text?: {
      content: string;
      fontSize: number;
      fontFamily: string;
      color: string;
      position: { x: number; y: number };
      backgroundColor?: string;
      textAlign?: string;
    }[];
    filters?: {
      type: string;
      intensity: number;
    }[];
    overlayImages?: {
      imageUrl: string;
      position: { x: number; y: number };
      scale: number;
      rotation: number;
    }[];
    music?: {
      audioUrl: string;
      startTime: number;
      duration: number;
    };
    effects?: {
      type: string;
      settings: Record<string, any>;
    }[];
  };
}

const applyTextOverlays = async (
  imageInput: string | Buffer, 
  texts: MediaEditRequest['edits']['text']
): Promise<sharp.Sharp> => {
  let image = sharp(imageInput);
  const metadata = await image.metadata();
  const width = metadata.width || 1080;
  const height = metadata.height || 1080;
  
  const svgTexts = texts?.map(text => {
    const x = text.position.x * width;
    const y = text.position.y * height;
    const bgColor = text.backgroundColor || 'transparent';
    
    return `
      <g>
        ${bgColor !== 'transparent' ? 
          `<rect 
            x="${x - 10}" 
            y="${y - text.fontSize}" 
            width="${text.content.length * text.fontSize * 0.6 + 20}" 
            height="${text.fontSize * 1.5}" 
            fill="${bgColor}" 
          />` : ''
        }
        <text 
          x="${x}" 
          y="${y}" 
          font-family="${text.fontFamily}" 
          font-size="${text.fontSize}px" 
          fill="${text.color}"
          text-anchor="${text.textAlign || 'start'}"
        >${text.content}</text>
      </g>
    `;
  }).join('');
  
  const svgOverlay = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${svgTexts}
    </svg>
  `;
  
  return image.composite([
    { input: Buffer.from(svgOverlay), gravity: 'northwest' }
  ]);
};

const applyFilters = async (
  imageProcess: sharp.Sharp, 
  filters: MediaEditRequest['edits']['filters']
): Promise<sharp.Sharp> => {
  if (!filters || filters.length === 0) return imageProcess;
  
  let processedImage = imageProcess;
  
  for (const filter of filters) {
    switch (filter.type) {
      case 'grayscale':
        processedImage = processedImage.grayscale(true);
        break;
      case 'sepia':
        processedImage = processedImage.modulate({
          brightness: 1.0,
          saturation: 0.5,
          hue: filter.intensity * 20
        });
        break;
      case 'brightness':
        processedImage = processedImage.modulate({
          brightness: 1 + filter.intensity
        });
        break;
      case 'contrast':
        processedImage = processedImage.linear(
            1 + filter.intensity, 0
        );
        break;
      case 'blur':
        processedImage = processedImage.blur(filter.intensity * 10);
        break;
      case 'sharpen':
        processedImage = processedImage.sharpen(filter.intensity * 10);
        break;
      case 'saturate':
        processedImage = processedImage.modulate({
          saturation: 1 + filter.intensity
        });
        break;
    }
  }
  
  return processedImage;
};

const applyImageOverlays = async (
  imageProcess: sharp.Sharp, 
  overlays: MediaEditRequest['edits']['overlayImages'],
  tempDir: string
): Promise<sharp.Sharp> => {
  if (!overlays || overlays.length === 0) return imageProcess;
  
  const metadata = await imageProcess.metadata();
  const width = metadata.width || 1080;
  const height = metadata.height || 1080;
  
  const overlayInputs = await Promise.all(overlays.map(async (overlay, index) => {
    let overlayPath;
    if (overlay.imageUrl.startsWith('http')) {
      const response = await fetch(overlay.imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      overlayPath = path.join(tempDir, `overlay_${index}.png`);
      await fs.writeFile(overlayPath, Buffer.from(arrayBuffer));
    } else {
      overlayPath = overlay.imageUrl;
    }
    
    const overlayImage = sharp(overlayPath)
      .resize(Math.round(width * overlay.scale), null, { fit: 'contain' })
      .rotate(overlay.rotation);
      
    const overlayBuffer = await overlayImage.toBuffer();
    
    return {
      input: overlayBuffer,
      left: Math.round(overlay.position.x * width),
      top: Math.round(overlay.position.y * height)
    };
  }));
  
  return imageProcess.composite(overlayInputs);
};

const applyEffects = async (
  imageProcess: sharp.Sharp, 
  effects: MediaEditRequest['edits']['effects']
): Promise<sharp.Sharp> => {
  if (!effects || effects.length === 0) return imageProcess;
  
  let processedImage = imageProcess;
  
  for (const effect of effects) {
    switch (effect.type) {
      case 'vignette': {
        const metadata = await processedImage.metadata();
        const width = metadata.width || 1080;
        const height = metadata.height || 1080;
        const intensity = effect.settings.intensity || 0.5;
        
        const vignetteOverlay = `
          <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="vignette" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" stop-color="rgba(0,0,0,0)" />
                <stop offset="100%" stop-color="rgba(0,0,0,${intensity})" />
              </radialGradient>
            </defs>
            <rect width="${width}" height="${height}" fill="url(#vignette)" />
          </svg>
        `;
        
        processedImage = processedImage.composite([
          { input: Buffer.from(vignetteOverlay), blend: 'multiply' }
        ]);
        break;
      }
        
      case 'duotone': {
        const color1 = effect.settings.color1 || '#000000';
        const color2 = effect.settings.color2 || '#ffffff';
        
        processedImage = processedImage
          .grayscale()
          .tint({ 
            r: parseInt(color1.slice(1, 3), 16),
            g: parseInt(color1.slice(3, 5)), 
            b: parseInt(color1.slice(5, 7)) 
          })
          .modulate({ brightness: 1.2 })
          .gamma(1.5);
        break;
      }
        
      case 'glitch':
        processedImage = processedImage
          .modulate({ brightness: 1.1 })
          .convolve({
            width: 3,
            height: 3,
            kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1]
          })
          .sharpen(5);
        break;
        
      case 'pixelate': {
        const pixelSize = effect.settings.size || 10;
        const imgMetadata = await processedImage.metadata();
        const imgWidth = imgMetadata.width || 1080;
        const imgHeight = imgMetadata.height || 1080;
        
        processedImage = processedImage
          .resize(Math.round(imgWidth / pixelSize), Math.round(imgHeight / pixelSize), { fit: 'cover' })
          .resize(imgWidth, imgHeight, { fit: 'cover', kernel: 'nearest' });
        break;
      }
    }
  }
  
  return processedImage;
};

const addMusicToMedia = async (
  mediaPath: string,
  mediaType: string,
  music: MediaEditRequest['edits']['music'],
  outputPath: string
): Promise<string> => {
  if (!music || mediaType !== 'video') {
    if (mediaType === 'image' && music) {
      return new Promise((resolve, reject) => {
        ffmpeg(mediaPath)
          .loop(music.duration)
          .addInput(music.audioUrl)
          .outputOptions([
            '-shortest',
            '-c:v libx264',
            '-pix_fmt yuv420p',
            '-c:a aac',
            '-b:a 192k'
          ])
          .duration(music.duration)
          .output(outputPath)
          .on('end', () => resolve(outputPath))
          .on('error', reject)
          .run();
      });
    }
    return mediaPath;
  }
  
  return new Promise((resolve, reject) => {
    ffmpeg(mediaPath)
      .addInput(music.audioUrl)
      .seekInput(music.startTime)
      .outputOptions([
        '-c:v copy',
        '-c:a aac',
        '-b:a 192k',
        '-shortest'
      ])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
};

export const editMedia = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const connection = await pool.getConnection();
  const tempDir = path.join(os.tmpdir(), uuidv4());
  await fs.mkdir(tempDir, { recursive: true });
  
  try {
    const user_id = req.user?.user_id;
    if (!user_id) return next(new AppError("Người dùng chưa được xác thực", 401, ErrorCode.INVALID_TOKEN));

    const editData = req.body as MediaEditRequest;
    if (!editData.mediaUrl && !editData.originalMediaId) {
      return next(new AppError("Thiếu thông tin media cần chỉnh sửa", 400, ErrorCode.MISSING_MEDIA_URL));
    }

    let mediaUrl = editData.mediaUrl;
    let mediaType = 'image';
    
    if (editData.originalMediaId) {
      const [mediaRows] = await connection.query<RowDataPacket[]>(
        "SELECT media_url, media_type FROM media WHERE media_id = ?",
        [editData.originalMediaId]
      );
      
      if (mediaRows.length === 0) {
        return next(new AppError("Không tìm thấy media với ID đã cung cấp", 404, ErrorCode.MEDIA_NOT_FOUND));
      }
      
      mediaUrl = mediaRows[0].media_url;
      mediaType = mediaRows[0].media_type;
    }
    
    const mediaPath = path.join(tempDir, `original_media${path.extname(mediaUrl || '')}`);
    const response = await fetch(mediaUrl!);
    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(mediaPath, Buffer.from(arrayBuffer));
    
    let processedMediaPath = mediaPath;
    
    if (mediaType === 'image') {
      let imageProcess = sharp(mediaPath);
      imageProcess = await applyFilters(imageProcess, editData.edits.filters);
      imageProcess = await applyEffects(imageProcess, editData.edits.effects);
      imageProcess = await applyImageOverlays(imageProcess, editData.edits.overlayImages, tempDir);
      
      if (editData.edits.text?.length) {
        const imageBuffer = await imageProcess.toBuffer();
        imageProcess = await applyTextOverlays(imageBuffer, editData.edits.text);
      }
      
      processedMediaPath = path.join(tempDir, `processed_image.png`);
      await imageProcess.toFile(processedMediaPath);
      
      if (editData.edits.music) {
        const videoPath = path.join(tempDir, 'processed_video.mp4');
        processedMediaPath = await addMusicToMedia(processedMediaPath, 'image', editData.edits.music, videoPath);
        mediaType = 'video';
      }
    } else if (mediaType === 'video') {
      const outputPath = path.join(tempDir, 'processed_video.mp4');
      if (editData.edits.music) {
        processedMediaPath = await addMusicToMedia(mediaPath, 'video', editData.edits.music, outputPath);
      }
    }
    
    const s3Key = `uploads/${user_id}/edited_media/${uuidv4()}${path.extname(processedMediaPath)}`;
    const uploadResult = await uploadToS3(processedMediaPath, s3Key);
    
    await connection.beginTransaction();
    
    const [mediaResult] = await connection.query<ResultSetHeader>(
      "INSERT INTO media (post_id, media_url, media_type) VALUES (NULL, ?, ?)",
      [uploadResult.Location, mediaType]
    );
    
    const mediaId = mediaResult.insertId;
    const editsToSave = [];

    if (editData.edits.text?.length) {
      editsToSave.push(['text', editData.edits.text]);
    }
    if (editData.edits.filters?.length) {
      editsToSave.push(['filter', editData.edits.filters]);
    }
    if (editData.edits.overlayImages?.length) {
      editsToSave.push(['overlay', editData.edits.overlayImages]);
    }
    if (editData.edits.music) {
      editsToSave.push(['music', editData.edits.music]);
    }
    if (editData.edits.effects?.length) {
      editsToSave.push(['effect', editData.edits.effects]);
    }

    if (editsToSave.length > 0) {
      await connection.query(
        "INSERT INTO media_edit (media_id, edit_type, edit_data) VALUES ?",
        [editsToSave.map(([type, data]) => 
          [mediaId, type, JSON.stringify(data)]
        )]
      );
    }

    await connection.commit();
    
    res.status(200).json({
      success: true,
      message: "Chỉnh sửa media thành công",
      media: {
        media_id: mediaId,
        media_url: uploadResult.Location,
        media_type: mediaType
      }
    });
    
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error("Error cleaning up temp files:", error);
    }
  }
};

export const getMediaLibrary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user_id = req.user?.user_id;
      if (!user_id) return next(new AppError("Người dùng chưa được xác thực", 401, ErrorCode.INVALID_TOKEN));
  
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
      const mediaType = ['image', 'video'].includes(req.query.type as string) ? req.query.type as string : null;
  
      if (page < 1) return next(new AppError("Tham số 'page' phải lớn hơn 0", 400));
      
      const offset = (page - 1) * limit;
      const queryParams: any[] = [user_id];
      
      let query = `
        SELECT 
          m.media_id, 
          m.media_url, 
          m.media_type, 
          m.created_at,
          p.post_id
        FROM media m
        LEFT JOIN posts p ON m.post_id = p.post_id
        WHERE p.user_id = ?
      `;
  
      if (mediaType) {
        query += " AND m.media_type = ?";
        queryParams.push(mediaType);
      }
  
      query += " ORDER BY m.created_at DESC LIMIT ?, ?";
      queryParams.push(offset, limit);
  
      const [media] = await pool.query<RowDataPacket[]>(query, queryParams);
  
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM media m
        LEFT JOIN posts p ON m.post_id = p.post_id
        WHERE p.user_id = ?
        ${mediaType ? "AND m.media_type = ?" : ""}
      `;
      
      const [countResult] = await pool.query<RowDataPacket[]>(
        countQuery,
        mediaType ? [user_id, mediaType] : [user_id]
      );
  
      const total = countResult[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);
  
      res.status(200).json({
        success: true,
        media,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages
        }
      });
      
    } catch (error) {
      next(new AppError("Lỗi hệ thống khi lấy danh sách media", 500, ErrorCode.SERVER_ERROR));
    }
  };