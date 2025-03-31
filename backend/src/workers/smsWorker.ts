import { smsQueue } from '../config/redis';
import { sendOTP } from '../config/sms';
import { Worker, Job } from 'bullmq';

interface SMSJobData {
  phone: string;
  code: string;
}

const smsWorker = new Worker<SMSJobData>('sms-queue', async (job: Job<SMSJobData>) => {
  const { phone, code } = job.data;
  await sendOTP(phone, code);
  return { sent: true };
}, {
  connection: smsQueue.opts.connection,
});

smsWorker.on('completed', (job) => {
  console.log(`SMS job ${job.id} completed successfully`);
});

smsWorker.on('failed', (job, err) => {
  console.error(`SMS job ${job?.id} failed with error: ${err.message}`);
});

export default smsWorker;