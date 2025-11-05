import { Worker, Job } from 'bullmq';
import { bullMQConnection, JobName, QueueName } from '../config/bullmq';
import notificationService from '../services/notification.service';

// Worker for processing notification jobs
export const notificationWorker = new Worker(
  QueueName.NOTIFICATIONS,
  async (job: Job) => {
    console.log(`📬 Processing notification job: ${job.name} (ID: ${job.id})`);

    try {
      switch (job.name) {
        case JobName.PROCESS_SCHEDULED_NOTIFICATIONS:
          await notificationService.processScheduledNotifications();
          console.log('✅ Scheduled notifications processed successfully');
          break;

        case JobName.SEND_NOTIFICATION:
          // Handle individual notification sending if needed
          const { userId, options } = job.data;
          await notificationService.sendToUser({
            userId,
            ...options,
          });
          console.log(`✅ Notification sent to user ${userId}`);
          break;

        default:
          console.warn(`⚠️  Unknown notification job: ${job.name}`);
      }
    } catch (error: any) {
      console.error(`❌ Error processing notification job ${job.name}:`, error);
      throw error; // Throw to trigger retry
    }
  },
  {
    connection: bullMQConnection,
    concurrency: 5, // Process up to 5 notification jobs concurrently
    limiter: {
      max: 10, // Maximum 10 jobs
      duration: 1000, // per second
    },
  }
);

// Worker event listeners
notificationWorker.on('completed', (job: Job) => {
  console.log(`✅ Notification job ${job.id} completed`);
});

notificationWorker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`❌ Notification job ${job?.id} failed:`, err.message);
});

notificationWorker.on('error', (err: Error) => {
  console.error('❌ Notification worker error:', err);
});

export default notificationWorker;

