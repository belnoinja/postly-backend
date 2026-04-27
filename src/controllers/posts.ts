import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../db/client';
import { generateContent } from '../services/ai';
import { queuePostJobs, publishingQueue } from '../services/publish';

export const publish = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { idea, post_type, platforms, tone, language, model } = req.body;
    const userId = req.user!.userId;

    const result = await generateContent({
      userId,
      idea,
      postType: post_type,
      platforms,
      tone,
      language,
      model
    });

    const post = await queuePostJobs({
      userId,
      idea,
      postType: post_type,
      tone,
      model,
      language
    }, result.generated);

    res.status(201).json({ data: post, error: null });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'PUBLISH_ERROR', message: error.message } });
  }
};

export const schedule = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { idea, post_type, platforms, tone, language, model, publish_at } = req.body;
    const userId = req.user!.userId;

    const result = await generateContent({
      userId,
      idea,
      postType: post_type,
      platforms,
      tone,
      language,
      model
    });

    const post = await queuePostJobs({
      userId,
      idea,
      postType: post_type,
      tone,
      model,
      language,
      publishAt: publish_at
    }, result.generated);

    res.status(201).json({ data: post, error: null });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SCHEDULE_ERROR', message: error.message } });
  }
};

export const getPosts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const skip = (page - 1) * limit;

    const status = req.query.status as string;
    const platform = req.query.platform as string;
    const from = req.query.from as string;
    const to = req.query.to as string;

    const where: any = { userId, deletedAt: null };
    if (status) where.status = status;
    if (platform) {
      where.platformPosts = { some: { platform } };
    }
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const posts = await prisma.post.findMany({
      where,
      include: { platformPosts: true },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.post.count({ where });

    res.status(200).json({
      data: posts,
      meta: { total, page, limit },
      error: null
    });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  }
};

export const getPost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const post = await prisma.post.findFirst({
      where: { id, userId },
      include: { platformPosts: true }
    });

    if (!post) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
      return;
    }

    res.status(200).json({ data: post, error: null });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  }
};

export const retryPost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const post = await prisma.post.findFirst({
      where: { id, userId },
      include: { platformPosts: true }
    });

    if (!post) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
      return;
    }

    const failedPlatforms = post.platformPosts.filter((p: any) => p.status === 'failed');
    
    for (const pp of failedPlatforms) {
      await prisma.platformPost.update({
        where: { id: pp.id },
        data: { status: 'queued', attempts: 0 }
      });
      
      await publishingQueue.add(
        'platform-post',
        {
          platformPostId: pp.id,
          postId: post.id,
          platform: pp.platform,
          content: pp.content,
          userId
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
      );
    }
    
    if (failedPlatforms.length > 0) {
      await prisma.post.update({
        where: { id: post.id },
        data: { status: 'processing' }
      });
    }

    res.status(200).json({ data: { requeued: failedPlatforms.length }, error: null });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'RETRY_ERROR', message: error.message } });
  }
};

export const deletePost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const post = await prisma.post.findFirst({
      where: { id, userId, deletedAt: null },
      include: { platformPosts: true }
    });

    if (!post) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
      return;
    }

    if (post.status === 'queued') {
      await prisma.platformPost.updateMany({
        where: { postId: id, status: 'queued' },
        data: { status: 'cancelled' }
      });
      
      await prisma.post.update({
        where: { id },
        data: { status: 'cancelled', deletedAt: new Date() }
      });
    } else {
      await prisma.post.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
    }

    res.status(200).json({ data: { success: true }, error: null });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'DELETE_ERROR', message: error.message } });
  }
};

export const restorePost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const post = await prisma.post.findFirst({
      where: { id, userId }
    });

    if (!post || !post.deletedAt) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found or not deleted' } });
      return;
    }

    await prisma.post.update({
      where: { id },
      data: { deletedAt: null }
    });

    res.status(200).json({ data: { success: true }, error: null });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'RESTORE_ERROR', message: error.message } });
  }
};
