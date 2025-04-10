import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const router = express.Router();

const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ success: false, message: 'Không có token, quyền truy cập bị từ chối' });
    return;
  }
  next();
};

router.get('/turn-credentials', authenticateJWT, (req: Request, res: Response): void => {
  try {
    const turnServerUris = (process.env.TURN_SERVER_URIS || '').split(',').filter(Boolean);
    
    if (turnServerUris.length === 0) {
      res.status(404).json({ 
        success: false, 
        message: 'TURN server chưa được cấu hình' 
      });
      return;
    }
    
    const ttl = parseInt(process.env.TURN_CREDENTIAL_TTL || '3600');
    const timestamp = Math.floor(Date.now() / 1000) + ttl;
    const username = `${timestamp}:socketio`;
    
    const secret = process.env.STATIC_TURN_SECRET || '';
    const hmac = crypto.createHmac('sha1', secret);
    hmac.update(username);
    const credential = hmac.digest('base64');
    
    res.json({
      success: true,
      urls: turnServerUris,
      username: username,
      credential: credential,
      ttl: ttl * 1000
    });
  } catch (error) {
    console.error('Lỗi khi tạo TURN credentials:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi tạo TURN credentials' 
    });
  }
});

export default router; 