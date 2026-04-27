import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../db/client';

export const getStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const totalPosts = await prisma.post.count({ where: { userId } });
    
    const platformPosts = await prisma.platformPost.findMany({
      where: { post: { userId } },
      select: { platform: true, status: true }
    });

    const totalPlatformPosts = platformPosts.length;
    const successful = platformPosts.filter(p => p.status === 'published').length;
    const successRate = totalPlatformPosts > 0 ? (successful / totalPlatformPosts) * 100 : 0;

    const postsPerPlatform: Record<string, number> = {};
    platformPosts.forEach(p => {
      postsPerPlatform[p.platform] = (postsPerPlatform[p.platform] || 0) + 1;
    });

    res.status(200).json({
      data: {
        totalPosts,
        successRate,
        postsPerPlatform
      },
      error: null
    });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'STATS_ERROR', message: error.message } });
  }
};
