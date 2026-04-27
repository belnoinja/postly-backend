import { Router, Request, Response } from 'express';
import { bot } from '../bot/bot';

const router = Router();

router.post('/telegram', (req: Request, res: Response) => {
  const secretToken = req.headers['x-telegram-bot-api-secret-token'];
  if (secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  bot.processUpdate(req.body);
  res.sendStatus(200);
});

export default router;
