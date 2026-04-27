import { redisClient } from '../db/redis';

const SESSION_PREFIX = 'session:bot:';
const TTL = 1800; // 30 minutes

export interface BotSession {
  step: 'type' | 'platforms' | 'tone' | 'model' | 'idea' | 'confirm';
  postType?: string;
  platforms?: string[];
  tone?: string;
  model?: 'openai' | 'anthropic';
  idea?: string;
  generatedContent?: any;
  userId?: string;
}

export async function getSession(chatId: number): Promise<BotSession | null> {
  const data = await redisClient.get(`${SESSION_PREFIX}${chatId}`);
  if (!data) return null;
  return JSON.parse(data);
}

export async function saveSession(chatId: number, session: BotSession): Promise<void> {
  await redisClient.set(`${SESSION_PREFIX}${chatId}`, JSON.stringify(session), 'EX', TTL);
}

export async function clearSession(chatId: number): Promise<void> {
  await redisClient.del(`${SESSION_PREFIX}${chatId}`);
}
