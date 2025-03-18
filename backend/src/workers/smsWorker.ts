import { smsQueue } from '../config/redis';
import { sendOTP } from '../config/sms';

smsQueue.process(async (job) => {
  const { phone, code } = job.data;
  await sendOTP(phone, code);
  return { sent: true };
});