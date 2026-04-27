import { Queue } from 'bullmq';
import { redisClient } from '../db/redis';
import prisma from '../db/client';

export const publishingQueue = new Queue('publishing', { connection: redisClient as any });

export async function queuePostJobs(postData: any, generatedContent: any) {
  const post = await prisma.post.create({
    data: {
      userId: postData.userId,
      idea: postData.idea,
      postType: postData.postType,
      tone: postData.tone,
      language: postData.language || 'en',
      modelUsed: postData.model,
      status: 'queued',
      publishAt: postData.publishAt ? new Date(postData.publishAt) : null
    }
  });

  for (const [platform, data] of Object.entries(generatedContent)) {
    if (!data) continue;
    
    const platformPost = await prisma.platformPost.create({
      data: {
        postId: post.id,
        platform,
        content: (data as any).content,
        status: 'queued'
      }
    });

    const delay = postData.publishAt ? new Date(postData.publishAt).getTime() - Date.now() : 0;

    await publishingQueue.add(
      'platform-post',
      {
        platformPostId: platformPost.id,
        postId: post.id,
        platform,
        content: (data as any).content,
        userId: postData.userId
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        delay: Math.max(delay, 0)
      }
    );
  }

  return post;
}
