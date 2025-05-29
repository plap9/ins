import { smsQueue } from '../config/redis';
import { sendOTP } from '../config/sms';
import { Worker, Job } from 'bullmq';

interface SMSJobData {
  phone: string;
  code: string;
}

const smsWorker = new Worker<SMSJobData>('sms-queue', async (job: Job<SMSJobData>) => {
  console.log(` [SMS Worker] Bắt đầu xử lý job ${job.id} cho số điện thoại: ${job.data.phone}`);
  
  try {
    const { phone, code } = job.data;
    const result = await sendOTP(phone, code);
    
    console.log(` [SMS Worker]  Gửi SMS thành công cho: ${phone}`);
    return { 
      sent: true, 
      phone: phone,
      messageId: result.sid,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(` [SMS Worker]  Lỗi gửi SMS cho ${job.data.phone}:`, error);
    throw error; 
  }
}, {
  connection: smsQueue.opts.connection,
  concurrency: 3, 
});

smsWorker.on('completed', (job, result) => {
  console.log(` [SMS Worker]  Job ${job.id} hoàn thành:`, result);
});

smsWorker.on('failed', (job, err) => {
  console.error(` [SMS Worker]  Job ${job?.id} thất bại:`, {
    error: err.message,
    phone: job?.data?.phone,
    attempts: job?.attemptsMade,
    maxAttempts: job?.opts?.attempts
  });
});

smsWorker.on('stalled', (jobId) => {
  console.warn(` [SMS Worker]  Job ${jobId} bị stalled`);
});

smsWorker.on('progress', (job, progress) => {
  console.log(` [SMS Worker] Job ${job.id} progress: ${progress}%`);
});

console.log(' [SMS Worker] Đã khởi tạo thành công với concurrency: 3');

export default smsWorker;