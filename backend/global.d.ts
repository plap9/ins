import { Queue } from 'bullmq';
import Redis from 'ioredis';

declare global {
  var testQueues: {
    email: Queue;
    sms: Queue;
    redis: Redis;
  };
}