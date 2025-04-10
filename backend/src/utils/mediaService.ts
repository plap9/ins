import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import crypto from 'crypto';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

interface MediaInfo {
  path: string;
  type: 'image' | 'video' | 'audio' | 'document';
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  variants: Record<string, string>;
  placeholder: string;
}

interface UploadSession {
  id: string;
  userId: number;
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  receivedChunks: Set<number>;
  chunkPaths: string[];
  createdAt: Date;
  completed: boolean;
}

interface MediaSizes {
  thumbnail: { width: number; height: number };
  small: { width: number; height: number };
  medium: { width: number; height: number };
  large: { width: number; height: number };
}

class MediaService {
  private readonly UPLOAD_DIR: string;
  private readonly CHUNK_DIR: string;
  private readonly MEDIA_SIZES: MediaSizes;
  private readonly MAX_CHUNK_SIZE: number = 2 * 1024 * 1024; 
  private readonly CHUNK_EXPIRY: number = 24 * 60 * 60 * 1000;
  private readonly SUPPORTED_IMAGE_TYPES: string[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private readonly SUPPORTED_VIDEO_TYPES: string[] = ['video/mp4', 'video/webm', 'video/ogg'];
  private readonly uploadSessions: Map<string, UploadSession> = new Map();

  constructor() {
    this.UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    this.CHUNK_DIR = path.join(this.UPLOAD_DIR, 'chunks');
    
    this.MEDIA_SIZES = {
      thumbnail: { width: 150, height: 150 },
      small: { width: 320, height: 320 },
      medium: { width: 640, height: 640 },
      large: { width: 1280, height: 1280 }
    };

    this.ensureDirectoriesExist();
    
    this.setupChunkCleanup();
  }

  private async ensureDirectoriesExist(): Promise<void> {
    try {
      if (!fs.existsSync(this.UPLOAD_DIR)) {
        await mkdir(this.UPLOAD_DIR, { recursive: true });
      }

      if (!fs.existsSync(this.CHUNK_DIR)) {
        await mkdir(this.CHUNK_DIR, { recursive: true });
      }

      const now = new Date();
      const monthDir = path.join(this.UPLOAD_DIR, `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`);
      
      if (!fs.existsSync(monthDir)) {
        await mkdir(monthDir, { recursive: true });
      }
      
      const variantsDir = path.join(this.UPLOAD_DIR, 'variants');
      if (!fs.existsSync(variantsDir)) {
        await mkdir(variantsDir, { recursive: true });
      }
      
      const placeholdersDir = path.join(this.UPLOAD_DIR, 'placeholders');
      if (!fs.existsSync(placeholdersDir)) {
        await mkdir(placeholdersDir, { recursive: true });
      }
    } catch (error) {
      console.error('Lỗi khi tạo thư mục uploads:', error);
      throw new Error('Không thể tạo thư mục uploads');
    }
  }

  private setupChunkCleanup(): void {
    setInterval(async () => {
      try {
        const files = await readdir(this.CHUNK_DIR);
        const now = Date.now();
        
        for (const file of files) {
          const filePath = path.join(this.CHUNK_DIR, file);
          const fileStat = await stat(filePath);
          const fileAge = now - fileStat.mtimeMs;
          
          if (fileAge > this.CHUNK_EXPIRY) {
            await unlink(filePath);
            console.log(`Đã xóa chunk file hết hạn: ${filePath}`);
          }
        }
        
        for (const [sessionId, session] of this.uploadSessions.entries()) {
          const sessionAge = now - session.createdAt.getTime();
          
          if (sessionAge > this.CHUNK_EXPIRY) {
            for (const chunkPath of session.chunkPaths) {
              if (fs.existsSync(chunkPath)) {
                await unlink(chunkPath);
              }
            }
            
            this.uploadSessions.delete(sessionId);
            console.log(`Đã xóa upload session hết hạn: ${sessionId}`);
          }
        }
      } catch (error) {
        console.error('Lỗi trong quá trình dọn dẹp chunk files:', error);
      }
    }, 60 * 60 * 1000); 
  }

  public initializeChunkUpload(
    fileId: string,
    fileName: string,
    fileSize: number,
    fileType: string,
    totalChunks: number,
    userId: number
  ): string {
    const sessionId = uuidv4();
    
    this.uploadSessions.set(sessionId, {
      id: sessionId,
      userId,
      fileId,
      fileName,
      fileSize,
      fileType,
      totalChunks,
      receivedChunks: new Set<number>(),
      chunkPaths: Array(totalChunks).fill(''),
      createdAt: new Date(),
      completed: false
    });
    
    return sessionId;
  }

  public async saveChunk(
    sessionId: string,
    fileId: string,
    chunkIndex: number,
    chunkData: Buffer,
    userId: number
  ): Promise<{ received: number; total: number; completed: boolean }> {
    const session = this.uploadSessions.get(sessionId);
    
    if (!session) {
      throw new Error('Phiên tải lên không tồn tại hoặc đã hết hạn');
    }
    
    if (session.userId !== userId) {
      throw new Error('Không có quyền tải lên cho phiên này');
    }
    
    if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
      throw new Error('Chỉ mục chunk không hợp lệ');
    }
    
    const chunkFileName = `${sessionId}_${fileId}_${chunkIndex}.chunk`;
    const chunkPath = path.join(this.CHUNK_DIR, chunkFileName);
    
    await writeFile(chunkPath, chunkData);
    
    session.receivedChunks.add(chunkIndex);
    session.chunkPaths[chunkIndex] = chunkPath;
    
    const completed = session.receivedChunks.size === session.totalChunks;
    session.completed = completed;
    
    return {
      received: session.receivedChunks.size,
      total: session.totalChunks,
      completed
    };
  }

  public async finalizeUpload(sessionId: string, fileId: string, userId: number): Promise<MediaInfo | null> {
    const session = this.uploadSessions.get(sessionId);
    
    if (!session) {
      throw new Error('Phiên tải lên không tồn tại hoặc đã hết hạn');
    }
    
    if (session.userId !== userId) {
      throw new Error('Không có quyền tải lên cho phiên này');
    }
    
    if (!session.completed) {
      throw new Error('Tải lên chưa hoàn tất');
    }
    
    try {
      const fileExt = path.extname(session.fileName);
      const safeFileName = `${Date.now()}_${fileId}${fileExt}`;
      
      const now = new Date();
      const monthDir = path.join(this.UPLOAD_DIR, `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`);
      
      const targetPath = path.join(monthDir, safeFileName);
      
      const writeStream = fs.createWriteStream(targetPath);
      
      const sortedChunkPaths = [...session.chunkPaths];
      
      for (const chunkPath of sortedChunkPaths) {
        if (fs.existsSync(chunkPath)) {
          const chunkData = await readFile(chunkPath);
          writeStream.write(chunkData);
          
          await unlink(chunkPath);
        }
      }
      
      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        writeStream.end();
      });
      
      this.uploadSessions.delete(sessionId);
      
      const relativePath = path.relative(this.UPLOAD_DIR, targetPath).replace(/\\/g, '/');
      const type = this.getMediaTypeFromMimeType(session.fileType);
      
      const mediaInfo: MediaInfo = {
        path: relativePath,
        type,
        mimeType: session.fileType,
        size: session.fileSize,
        variants: {},
        placeholder: ''
      };
      
      if (type === 'image') {
        await this.processImage(targetPath, mediaInfo);
      } else if (type === 'video') {
        await this.processVideo(targetPath, mediaInfo);
      }
      
      return mediaInfo;
    } catch (error) {
      console.error('Lỗi khi hoàn tất tải lên:', error);
      return null;
    }
  }

  public async cancelUpload(sessionId: string, fileId: string, userId: number): Promise<void> {
    const session = this.uploadSessions.get(sessionId);
    
    if (!session) {
      return;
    }
    
    if (session.userId !== userId) {
      throw new Error('Không có quyền hủy tải lên cho phiên này');
    }
    
    for (const chunkPath of session.chunkPaths) {
      if (chunkPath && fs.existsSync(chunkPath)) {
        await unlink(chunkPath);
      }
    }
    
    this.uploadSessions.delete(sessionId);
  }

  private async processImage(imagePath: string, mediaInfo: MediaInfo): Promise<void> {
    try {
      const imageInfo = await sharp(imagePath).metadata();
      
      mediaInfo.width = imageInfo.width;
      mediaInfo.height = imageInfo.height;
      
      const variantsDir = path.join(this.UPLOAD_DIR, 'variants');
      const placeholdersDir = path.join(this.UPLOAD_DIR, 'placeholders');
      
      if (!fs.existsSync(variantsDir)) {
        await mkdir(variantsDir, { recursive: true });
      }
      
      if (!fs.existsSync(placeholdersDir)) {
        await mkdir(placeholdersDir, { recursive: true });
      }
      
      const originalFilename = path.basename(imagePath);
      const fileNameWithoutExt = path.basename(originalFilename, path.extname(originalFilename));
      
      for (const [size, dimensions] of Object.entries(this.MEDIA_SIZES)) {
        const variantFilename = `${fileNameWithoutExt}_${size}${path.extname(originalFilename)}`;
        const variantPath = path.join(variantsDir, variantFilename);
        
        await sharp(imagePath)
          .resize({
            width: dimensions.width,
            height: dimensions.height,
            fit: sharp.fit.inside,
            withoutEnlargement: true
          })
          .toFile(variantPath);
        
        mediaInfo.variants[size] = path.relative(this.UPLOAD_DIR, variantPath).replace(/\\/g, '/');
      }
      
      const placeholderFilename = `${fileNameWithoutExt}_placeholder.webp`;
      const placeholderPath = path.join(placeholdersDir, placeholderFilename);
      
      await sharp(imagePath)
        .resize(20, 20)
        .blur(5)
        .toFormat('webp')
        .toFile(placeholderPath);
      
      mediaInfo.placeholder = path.relative(this.UPLOAD_DIR, placeholderPath).replace(/\\/g, '/');
    } catch (error) {
      console.error('Lỗi khi xử lý hình ảnh:', error);
      throw new Error('Không thể xử lý hình ảnh');
    }
  }

  private async processVideo(videoPath: string, mediaInfo: MediaInfo): Promise<void> {
    try {
      const variantsDir = path.join(this.UPLOAD_DIR, 'variants');
      const placeholdersDir = path.join(this.UPLOAD_DIR, 'placeholders');
      
      if (!fs.existsSync(variantsDir)) {
        await mkdir(variantsDir, { recursive: true });
      }
      
      if (!fs.existsSync(placeholdersDir)) {
        await mkdir(placeholdersDir, { recursive: true });
      }
      
      const videoInfo = await this.getVideoInfo(videoPath);
      
      mediaInfo.width = videoInfo.width;
      mediaInfo.height = videoInfo.height;
      mediaInfo.duration = videoInfo.duration;
      
      const originalFilename = path.basename(videoPath);
      const fileNameWithoutExt = path.basename(originalFilename, path.extname(originalFilename));
      
      const thumbnailFilename = `${fileNameWithoutExt}_thumbnail.jpg`;
      const thumbnailPath = path.join(placeholdersDir, thumbnailFilename);
      
      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
          .screenshots({
            timestamps: ['00:00:01'],
            filename: thumbnailFilename,
            folder: placeholdersDir,
            size: '320x240'
          })
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });
      
      mediaInfo.placeholder = path.relative(this.UPLOAD_DIR, thumbnailPath).replace(/\\/g, '/');
      
      const qualities = [
        { name: '360p', resolution: '640x360', bitrate: '800k' },
        { name: '480p', resolution: '854x480', bitrate: '1500k' },
        { name: '720p', resolution: '1280x720', bitrate: '2500k' }
      ];
      
      for (const quality of qualities) {
        const variantFilename = `${fileNameWithoutExt}_${quality.name}.mp4`;
        const variantPath = path.join(variantsDir, variantFilename);
        
        await new Promise<void>((resolve, reject) => {
          ffmpeg(videoPath)
            .outputOptions([
              `-c:v libx264`,
              `-b:v ${quality.bitrate}`,
              `-maxrate ${quality.bitrate}`,
              `-bufsize ${parseInt(quality.bitrate.replace('k', '')) * 2}k`,
              `-vf scale=${quality.resolution}`,
              `-c:a aac`,
              `-b:a 128k`,
              `-f mp4`
            ])
            .output(variantPath)
            .on('end', () => resolve())
            .on('error', (err) => reject(err));
        });
        
        mediaInfo.variants[quality.name] = path.relative(this.UPLOAD_DIR, variantPath).replace(/\\/g, '/');
      }
    } catch (error) {
      console.error('Lỗi khi xử lý video:', error);
      throw new Error('Không thể xử lý video');
    }
  }

  private async getVideoInfo(videoPath: string): Promise<{ width: number; height: number; duration: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          return reject(err);
        }
        
        const { width, height, duration } = metadata.streams[0];
        
        resolve({
          width: typeof width === 'number' ? width : parseInt(width || '0', 10) || 0,
          height: typeof height === 'number' ? height : parseInt(height || '0', 10) || 0,
          duration: typeof duration === 'number' ? duration : parseFloat(duration || '0') || 0
        });
      });
    });
  }

  private getMediaTypeFromMimeType(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
    if (this.SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
      return 'image';
    } else if (this.SUPPORTED_VIDEO_TYPES.includes(mimeType)) {
      return 'video';
    } else if (mimeType.startsWith('audio/')) {
      return 'audio';
    } else {
      return 'document';
    }
  }

  public getMediaType(filePath: string): 'image' | 'video' | 'audio' | 'document' {
    const ext = path.extname(filePath).toLowerCase();
    
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      return 'image';
    } else if (['.mp4', '.webm', '.ogg', '.mov'].includes(ext)) {
      return 'video';
    } else if (['.mp3', '.wav', '.ogg', '.aac'].includes(ext)) {
      return 'audio';
    } else {
      return 'document';
    }
  }

  public getMediaVariants(mediaPath: string): Record<string, string> {
    const type = this.getMediaType(mediaPath);
    const fileName = path.basename(mediaPath);
    const fileNameWithoutExt = path.basename(fileName, path.extname(fileName));
    const variants: Record<string, string> = {};
    
    if (type === 'image') {
      for (const size of Object.keys(this.MEDIA_SIZES)) {
        variants[size] = `variants/${fileNameWithoutExt}_${size}${path.extname(fileName)}`;
      }
    } else if (type === 'video') {
      for (const quality of ['360p', '480p', '720p']) {
        variants[quality] = `variants/${fileNameWithoutExt}_${quality}.mp4`;
      }
    }
    
    return variants;
  }

  public getPlaceholderUrl(mediaPath: string): string {
    const type = this.getMediaType(mediaPath);
    const fileName = path.basename(mediaPath);
    const fileNameWithoutExt = path.basename(fileName, path.extname(fileName));
    
    if (type === 'image') {
      return `placeholders/${fileNameWithoutExt}_placeholder.webp`;
    } else if (type === 'video') {
      return `placeholders/${fileNameWithoutExt}_thumbnail.jpg`;
    }
    
    return '';
  }

  public getMaxChunkSize(): number {
    return this.MAX_CHUNK_SIZE;
  }
}

export default MediaService; 