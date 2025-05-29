import express from 'express';
import workerManager from '../workers/workerManager';
import { emailQueue, smsQueue } from '../config/redis';

const router = express.Router();

// GET /workers/status - Lấy trạng thái workers
router.get('/status', async (req, res) => {
  try {
    const workerStats = workerManager.getWorkerStats();
    
    // Lấy thống kê queue
    const [emailWaiting, emailActive, emailCompleted, emailFailed] = await Promise.all([
      emailQueue.getWaiting(),
      emailQueue.getActive(), 
      emailQueue.getCompleted(),
      emailQueue.getFailed()
    ]);

    const [smsWaiting, smsActive, smsCompleted, smsFailed] = await Promise.all([
      smsQueue.getWaiting(),
      smsQueue.getActive(),
      smsQueue.getCompleted(), 
      smsQueue.getFailed()
    ]);

    res.json({
      success: true,
      data: {
        workers: workerStats,
        queues: {
          email: {
            waiting: emailWaiting.length,
            active: emailActive.length,
            completed: emailCompleted.length,
            failed: emailFailed.length
          },
          sms: {
            waiting: smsWaiting.length,
            active: smsActive.length,
            completed: smsCompleted.length,
            failed: smsFailed.length
          }
        }
      }
    });
  } catch (error) {
    console.error('Lỗi lấy trạng thái workers:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy trạng thái workers'
    });
  }
});

// POST /workers/pause - Tạm dừng tất cả workers
router.post('/pause', async (req, res) => {
  try {
    await workerManager.pauseAllWorkers();
    res.json({
      success: true,
      message: 'Đã tạm dừng tất cả workers'
    });
  } catch (error) {
    console.error('Lỗi tạm dừng workers:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tạm dừng workers'
    });
  }
});

// POST /workers/resume - Tiếp tục tất cả workers
router.post('/resume', async (req, res) => {
  try {
    await workerManager.resumeAllWorkers();
    res.json({
      success: true,
      message: 'Đã tiếp tục tất cả workers'
    });
  } catch (error) {
    console.error('Lỗi tiếp tục workers:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tiếp tục workers'
    });
  }
});

// GET /workers/jobs/failed - Lấy danh sách jobs thất bại
router.get('/jobs/failed', async (req, res) => {
  try {
    const [emailFailed, smsFailed] = await Promise.all([
      emailQueue.getFailed(),
      smsQueue.getFailed()
    ]);

    res.json({
      success: true,
      data: {
        email: emailFailed.map(job => ({
          id: job.id,
          data: job.data,
          failedReason: job.failedReason,
          timestamp: job.timestamp
        })),
        sms: smsFailed.map(job => ({
          id: job.id,
          data: job.data,
          failedReason: job.failedReason,
          timestamp: job.timestamp
        }))
      }
    });
  } catch (error) {
    console.error('Lỗi lấy jobs thất bại:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách jobs thất bại'
    });
  }
});

// POST /workers/jobs/retry - Retry jobs thất bại
router.post('/jobs/retry', async (req, res) => {
  try {
    const { type } = req.body; // 'email' hoặc 'sms' hoặc 'all'
    
    if (type === 'email' || type === 'all') {
      const failedJobs = await emailQueue.getFailed();
      await Promise.all(failedJobs.map(job => job.retry()));
    }
    
    if (type === 'sms' || type === 'all') {
      const failedJobs = await smsQueue.getFailed();
      await Promise.all(failedJobs.map(job => job.retry()));
    }

    res.json({
      success: true,
      message: `Đã retry jobs ${type}`
    });
  } catch (error) {
    console.error('Lỗi retry jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể retry jobs'
    });
  }
});

export default router; 