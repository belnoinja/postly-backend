import { Router } from 'express';
import { publish, schedule, getPosts, getPost, retryPost, deletePost } from '../controllers/posts';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/publish', publish);
router.post('/schedule', schedule);
router.get('/', getPosts);
router.get('/:id', getPost);
router.post('/:id/retry', retryPost);
router.delete('/:id', deletePost);

export default router;
