import emailWorker from './emailWorker';
import smsWorker from './smsWorker';

class WorkerManager {
  private workers: any[] = [];
  private isShuttingDown = false;

  constructor() {
    this.workers = [emailWorker, smsWorker];
    this.setupGracefulShutdown();
  }

  private setupGracefulShutdown() {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      console.log(` [Worker Manager] Nhận tín hiệu ${signal}, đang shutdown workers...`);
      
      try {
        await Promise.all(
          this.workers.map(async (worker, index) => {
            console.log(` [Worker Manager] Đang đóng worker ${index + 1}...`);
            await worker.close();
            console.log(` [Worker Manager] Worker ${index + 1} đã đóng thành công`);
          })
        );
        
        console.log(' [Worker Manager] Tất cả workers đã được đóng thành công');
        process.exit(0);
      } catch (error) {
        console.error(' [Worker Manager] Lỗi khi đóng workers:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  getWorkerStats() {
    return {
      totalWorkers: this.workers.length,
      workers: [
        {
          name: 'Email Worker',
          status: 'running',
          concurrency: 5
        },
        {
          name: 'SMS Worker', 
          status: 'running',
          concurrency: 3
        }
      ]
    };
  }

  async pauseAllWorkers() {
    console.log(' [Worker Manager] Tạm dừng tất cả workers...');
    await Promise.all(this.workers.map(worker => worker.pause()));
    console.log(' [Worker Manager] Tất cả workers đã được tạm dừng');
  }

  async resumeAllWorkers() {
    console.log(' [Worker Manager] Tiếp tục tất cả workers...');
    await Promise.all(this.workers.map(worker => worker.resume()));
    console.log(' [Worker Manager] Tất cả workers đã được tiếp tục');
  }
}

export default new WorkerManager(); 