import { Router } from 'express';
import { generate } from '../controllers/content';

const router = Router();

router.post('/generate', generate);

export default router;
