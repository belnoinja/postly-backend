import { Router } from 'express';
import { twitterLogin, twitterCallback } from '../controllers/oauth';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/twitter/login', twitterLogin);
router.post('/twitter/callback', twitterCallback);

export default router;
