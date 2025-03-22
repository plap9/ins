import { emailQueue } from '../config/redis';
import { sendVerificationEmail } from '../config/email';
import { Worker, Job } from 'bullmq';

interface EmailJobData {
  email: string;
  code: string;
}

const emailWorker = new Worker<EmailJobData>('email-queue', async (job: Job<EmailJobData>) => {
  const { email, code } = job.data;
  await sendVerificationEmail(email, code);
  return { sent: true };
}, {
  connection: emailQueue.opts.connection,
});

emailWorker.on('completed', (job) => {
  console.log(`Email job ${job.id} completed successfully`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`Email job ${job?.id} failed with error: ${err.message}`);
});

export default emailWorker;