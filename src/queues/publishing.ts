import { Worker, Job } from 'bullmq';
import { redisClient } from '../db/redis';
import prisma from '../db/client';

export const publishingWorker = new Worker(
  'publishing',
  async (job: Job) => {
    const { platformPostId, postId, platform, content, userId } = job.data;

    await prisma.platformPost.update({
      where: { id: platformPostId },
      data: { status: 'processing', attempts: { increment: 1 } }
    });

    try {
      console.log(`[Worker] Publishing to ${platform} for user ${userId}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (Math.random() < 0.1) throw new Error('API Rate Limited');

      await prisma.platformPost.update({
        where: { id: platformPostId },
        data: { status: 'published', publishedAt: new Date() }
      });

      await updateParentPostStatus(postId);
    } catch (error: any) {
      throw error;
    }
  },
  { connection: redisClient as any }
);

publishingWorker.on('failed', async (job: Job | undefined, err: Error) => {
  if (!job) return;
  const { platformPostId, postId } = job.data;
  
  if (job.attemptsMade >= (job.opts.attempts || 3)) {
    await prisma.platformPost.update({
      where: { id: platformPostId },
      data: { status: 'failed', errorMessage: err.message }
    });
    await updateParentPostStatus(postId);
  }
});

async function updateParentPostStatus(postId: string) {
  const platformPosts = await prisma.platformPost.findMany({ where: { postId } });
  
  const allPublished = platformPosts.every(p => p.status === 'published');
  const allFailed = platformPosts.every(p => p.status === 'failed');
  const cancelled = platformPosts.every(p => p.status === 'cancelled');

  let newStatus = 'processing';
  if (allPublished) newStatus = 'published';
  else if (allFailed) newStatus = 'failed';
  else if (cancelled) newStatus = 'cancelled';
  else if (platformPosts.some(p => p.status === 'failed' || p.status === 'published')) {
    newStatus = 'partial';
  }

  await prisma.post.update({
    where: { id: postId },
    data: { status: newStatus }
  });
}
