import cron from 'node-cron';
import prisma from './db/client';
import { publishingQueue } from './services/publish';

export function startCronJobs() {
  // Check every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      const duePlatformPosts = await prisma.platformPost.findMany({
        where: {
          status: 'queued',
          post: {
            publishAt: { lte: now },
            deletedAt: null
          }
        },
        include: { post: true }
      });

      for (const pp of duePlatformPosts) {
        // Enqueue immediately
        await publishingQueue.add(
          'platform-post',
          {
            platformPostId: pp.id,
            postId: pp.postId,
            platform: pp.platform,
            content: pp.content,
            userId: pp.post.userId
          },
          { attempts: 3, backoff: { type: 'exponential', delay: 1000 }, delay: 0 }
        );
      }
      
      if (duePlatformPosts.length > 0) {
         console.log(`[Cron] Dispatched ${duePlatformPosts.length} scheduled jobs.`);
      }
    } catch (err) {
      console.error('[Cron] Error running scheduled jobs:', err);
    }
  });
  
  console.log('[Cron] Scheduled job dispatcher started.');
}
