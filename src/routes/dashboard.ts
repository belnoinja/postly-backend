import { Router } from 'express';
import { getStats } from '../controllers/dashboard';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/stats', getStats);

export default router;
