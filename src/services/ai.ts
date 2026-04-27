import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import prisma from '../db/client';
import { decrypt } from '../utils/encryption';

export async function generateContent({
  userId,
  idea,
  postType,
  platforms,
  tone,
  language,
  model,
}: {
  userId: string;
  idea: string;
  postType: string;
  platforms: string[];
  tone: string;
  language: string;
  model: 'openai' | 'anthropic';
}) {
  const userAiKeys = await prisma.aiKeys.findUnique({ where: { userId } });
  
  let openaiKey = process.env.OPENAI_API_KEY;
  let anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (userAiKeys?.openaiKeyEnc) openaiKey = decrypt(userAiKeys.openaiKeyEnc);
  if (userAiKeys?.anthropicKeyEnc) anthropicKey = decrypt(userAiKeys.anthropicKeyEnc);

  const prompt = `
Generate social media posts based on the following idea:
"${idea}"

Tone: ${tone}
Language: ${language}
Post Type: ${postType}

Please generate content for the following platforms: ${platforms.join(', ')}.
Rules:
- Twitter: Max 280 characters, 2-3 hashtags, punchy opener.
- LinkedIn: 800-1300 chars, 3-5 hashtags, professional tone.
- Instagram: Caption format, emoji-friendly, 10-15 hashtags.
- Threads: Max 500 chars, conversational.

Return ONLY a strictly valid JSON object in the following format:
{
  "twitter": { "content": "...", "char_count": 0, "hashtags": [] },
  "linkedin": { "content": "...", "char_count": 0, "hashtags": [] },
  "instagram": { "content": "...", "hashtags": [] },
  "threads": { "content": "..." }
}
  `;

  if (model === 'openai') {
    if (!openaiKey) throw new Error('NO_AI_KEY_AVAILABLE');
    const openai = new OpenAI({ apiKey: openaiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });
    
    return {
      generated: JSON.parse(response.choices[0].message.content || '{}'),
      model_used: 'gpt-4o',
      tokens_used: response.usage?.total_tokens || 0
    };
  } else if (model === 'anthropic') {
    if (!anthropicKey) throw new Error('NO_AI_KEY_AVAILABLE');
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const contentText = (response.content[0] as any).text;
    let parsed = {};
    try {
      parsed = JSON.parse(contentText);
    } catch {
      const match = contentText.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    return {
      generated: parsed,
      model_used: 'claude-3-5-sonnet-20241022',
      tokens_used: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
    };
  }
  throw new Error('INVALID_MODEL');
}
