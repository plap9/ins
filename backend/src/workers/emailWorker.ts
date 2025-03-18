import { emailQueue } from '../config/redis';
import { sendVerificationEmail } from '../config/email';

emailQueue.process(async (job) => {
  const { email, token } = job.data;
  await sendVerificationEmail(email, token);
  return { sent: true };
});