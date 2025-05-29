import { emailQueue } from '../config/redis';
import { sendVerificationEmail } from '../config/email';
import { Worker, Job } from 'bullmq';

interface EmailJobData {
  email: string;
  code: string;
}

const emailWorker = new Worker<EmailJobData>('email-queue', async (job: Job<EmailJobData>) => {
  console.log(` [Email Worker] Bắt đầu xử lý job ${job.id} cho email: ${job.data.email}`);
  
  try {
    const { email, code } = job.data;
    await sendVerificationEmail(email, code);
    
    console.log(` [Email Worker]  Gửi email thành công cho: ${email}`);
    return { 
      sent: true, 
      email: email,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(` [Email Worker]  Lỗi gửi email cho ${job.data.email}:`, error);
    throw error; 
  }
}, {
  connection: emailQueue.opts.connection,
  concurrency: 5, 
});

emailWorker.on('completed', (job, result) => {
  console.log(` [Email Worker]  Job ${job.id} hoàn thành:`, result);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[Email Worker]  Job ${job?.id} thất bại:`, {
    error: err.message,
    email: job?.data?.email,
    attempts: job?.attemptsMade,
    maxAttempts: job?.opts?.attempts
  });
});

emailWorker.on('stalled', (jobId) => {
  console.warn(`📧 [Email Worker] ⚠️ Job ${jobId} bị stalled`);
});

emailWorker.on('progress', (job, progress) => {
  console.log(`📧 [Email Worker] 🔄 Job ${job.id} progress: ${progress}%`);
});

console.log('📧 [Email Worker] Đã khởi tạo thành công với concurrency: 5');

export default emailWorker;