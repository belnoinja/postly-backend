import { Request, Response } from 'express';
import { generateContent } from '../services/ai';

export const generate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idea, post_type, platforms, tone, language, model, userId } = req.body;
    
    if (idea.length > 500) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'idea must be under 500 characters' } });
      return;
    }

    const result = await generateContent({
      userId,
      idea,
      postType: post_type,
      platforms,
      tone,
      language,
      model
    });

    res.status(200).json({ data: result, error: null });
  } catch (error: any) {
    if (error.message === 'NO_AI_KEY_AVAILABLE') {
       res.status(500).json({ error: { code: 'NO_AI_KEY_AVAILABLE', message: 'No AI key found' } });
    } else {
       console.error("AI Gen Error:", error);
       res.status(500).json({ error: { code: 'AI_PARSE_ERROR', message: 'Something went wrong generating content.' } });
    }
  }
};
