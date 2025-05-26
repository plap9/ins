import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import http from 'http';
import compression from 'compression';
import authRouter from "./routes/auth";
import post from "./routes/post";
import user from "./routes/user";
import { globalErrorHandler, notFoundHandler } from './middlewares/errorHandler';
import comment from "./routes/comment";
import cacheRoutes from "./routes/cache";
import story from "./routes/story";
import search from "./routes/search";
import messageRoutes from "./routes/messageRoutes";
import webrtcRoutes from "./routes/webrtcRoutes";
import followRoutes from "./routes/follow";
import feedRoutes from "./routes/feed";
import SocketService from './utils/socketService';
import { initializeSocketService as initMessageSocketService } from './controllers/messages/messageController';
import { initializeSocketService as initSocketHandlers, setupMessageSocketHandlers } from './controllers/messages/messageSocketController';

dotenv.config();
const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

process.env.STUN_URLS = process.env.STUN_URLS || 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302';

if (!process.env.TURN_SERVER_URIS) {
  console.warn('CẢNH BÁO: TURN server chưa được cấu hình. WebRTC có thể không hoạt động qua NAT nghiêm ngặt!');
}

process.env.ENABLE_SFU = process.env.ENABLE_SFU || 'true';
process.env.MAX_P2P_PARTICIPANTS = process.env.MAX_P2P_PARTICIPANTS || '4';

const server = http.createServer(app);

app.use(compression({
  threshold: 1024,
  filter: (req: express.Request, res: express.Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6
}));

app.use(cors({
  origin: [
    'http://localhost:8081',       
    /\.exp\.host$/,                
    'http://192.168.1.31:19000',     
    'exp://192.168.1.31:19000',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:19006',
    'exp://192.168.1.31:8081',
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
    'http://192.168.63.181:5000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});
app.use("/posts", post);
app.use("/auth", authRouter);
app.use("/users", followRoutes);
app.use("/users", user);
app.use("/comments", comment);
app.use("/cache", cacheRoutes);
app.use("/stories", story);
app.use("/search", search);
app.use("/messages", messageRoutes);
app.use("/webrtc", webrtcRoutes);
app.use("/follow", followRoutes);
app.use("/feed", feedRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

let socketService: SocketService | null = null;

if (require.main === module) {
  socketService = new SocketService(server);

  initMessageSocketService(socketService);
  initSocketHandlers(socketService);

  socketService.registerSocketHandler((socket, userId) => {
    setupMessageSocketHandlers(socket, userId);
  });

  server.listen(PORT, '0.0.0.0', () => {
    const ip = getIPAddress();
    console.log(`Server đang chạy với socket.io trên:`);
    console.log(`- Local: http://localhost:${PORT}`);
    console.log(`- Network: http://${ip}:${PORT}`);
    console.log(`\n*** ĐỂ KẾT NỐI TỪ FRONTEND, SỬ DỤNG: ***`);
    console.log(`API_URL = "http://${ip}:${PORT}"\n`);
  });
}

function getIPAddress() {
  const interfaces = require('os').networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

export { app, server, socketService };