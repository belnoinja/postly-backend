import { Router } from 'express';
import { publish, schedule, getPosts, getPost, retryPost, deletePost, restorePost } from '../controllers/posts';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/publish', publish);
router.post('/schedule', schedule);
router.get('/', getPosts);
router.get('/:id', getPost);
router.post('/:id/retry', retryPost);
router.delete('/:id', deletePost);
router.post('/:id/restore', restorePost);

export default router;
