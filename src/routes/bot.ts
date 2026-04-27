import { Router, Request, Response } from 'express';
import { bot } from '../bot/bot';

const router = Router();

router.post('/telegram', (req: Request, res: Response) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

export default router;
