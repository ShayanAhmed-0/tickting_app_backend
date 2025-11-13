import { Worker, Job } from 'bullmq';
import { bullMQConnection, JobName, QueueName } from '../config/bullmq';
import tripReminderService from '../services/trip-reminder.service';

// Worker for processing bus capacity check jobs
export const busCapacityWorker = new Worker(
  QueueName.BUS_CAPACITY,
  async (job: Job) => {
    console.log(`🚌 Processing bus capacity job: ${job.name} (ID: ${job.id})`);

    try {
      switch (job.name) {
        case JobName.CHECK_BUS_CAPACITY:
          await tripReminderService.checkBusCapacity();
          console.log('✅ Bus capacity check completed successfully');
          break;

        default:
          console.warn(`⚠️  Unknown bus capacity job: ${job.name}`);
      }
    } catch (error: any) {
      console.error(`❌ Error processing bus capacity job ${job.name}:`, error);
      throw error; // Throw to trigger retry
    }
  },
  {
    connection: bullMQConnection,
    concurrency: 1, // Process one at a time
    limiter: {
      max: 1, // Maximum 1 job
      duration: 60000, // per minute
    },
  }
);

// Worker event listeners
busCapacityWorker.on('completed', (job: Job) => {
  console.log(`✅ Bus capacity job ${job.id} completed`);
});

busCapacityWorker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`❌ Bus capacity job ${job?.id} failed:`, err.message);
});

busCapacityWorker.on('error', (err: Error) => {
  console.error('❌ Bus capacity worker error:', err);
});

export default busCapacityWorker;

