import { Request, Response } from 'express';
import twilio from 'twilio';
import { getSession, saveSession, clearSession, BotSession } from './state';
import { generateContent } from '../services/ai';
import { queuePostJobs } from '../services/publish';
import prisma from '../db/client';

const accountSid = process.env.TWILIO_ACCOUNT_SID || 'mock_sid';
const authToken = process.env.TWILIO_AUTH_TOKEN || 'mock_token';
const client = twilio(accountSid, authToken);

const sendMessage = async (to: string, body: string) => {
  if (process.env.NODE_ENV === 'test') return;
  try {
    await client.messages.create({
      body,
      from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
      to
    });
  } catch (error) {
    console.error('[WhatsApp] Failed to send message:', error);
  }
};

export const handleWhatsAppWebhook = async (req: Request, res: Response) => {
  const { Body, From } = req.body;
  if (!Body || !From) {
    return res.status(400).send('Bad Request');
  }

  const chatId = parseInt(From.replace(/\D/g, '').substring(0, 15), 10);
  const text = Body.trim();

  try {
    let session = await getSession(chatId);

    if (text.toLowerCase() === '/start') {
      await clearSession(chatId);
      const user = await prisma.user.findFirst();
      if (!user) {
        await sendMessage(From, "No user configured in DB.");
        return res.status(200).send('OK');
      }

      await saveSession(chatId, { step: 'type', userId: user.id });
      await sendMessage(From, "Welcome to Postly! What type of post? (announcement, thread, story, etc.)");
      return res.status(200).send('OK');
    }

    if (!session) {
      await sendMessage(From, "Send /start to begin a new post.");
      return res.status(200).send('OK');
    }

    switch (session.step) {
      case 'type':
        session.postType = text;
        session.step = 'platforms';
        await saveSession(chatId, session);
        await sendMessage(From, "Which platforms? (e.g. twitter, linkedin)");
        break;

      case 'platforms':
        session.platforms = text.split(',').map((s: string) => s.trim());
        session.step = 'tone';
        await saveSession(chatId, session);
        await sendMessage(From, "What tone? (e.g. professional, funny, aggressive)");
        break;

      case 'tone':
        session.tone = text;
        session.step = 'model';
        await saveSession(chatId, session);
        await sendMessage(From, "Which model? (openai or anthropic)");
        break;

      case 'model':
        session.model = text.toLowerCase().includes('openai') ? 'openai' : 'anthropic';
        session.step = 'idea';
        await saveSession(chatId, session);
        await sendMessage(From, "Tell me the idea or core message — keep it brief.");
        break;

      case 'idea':
        session.idea = text;
        session.step = 'confirm';
        await sendMessage(From, "Generating preview... Please wait.");
        
        try {
          const content = await generateContent({
            userId: session.userId || '',
            idea: session.idea || '',
            postType: session.postType || '',
            platforms: session.platforms || [],
            tone: session.tone || '',
            language: 'english',
            model: (session.model || 'openai') as 'openai' | 'anthropic'
          });
          
          session.generatedContent = content.generated;
          await saveSession(chatId, session);

          let previewText = "Here is the preview:\n\n";
          for (const [plat, data] of Object.entries(content.generated)) {
            if (data) {
              previewText += `*${plat.toUpperCase()}:*\n${(data as any).content}\n\n`;
            }
          }
          previewText += "Do you want to queue this for publishing? (yes/no)";
          await sendMessage(From, previewText);
        } catch (err: any) {
          console.error(err);
          await sendMessage(From, "Failed to generate content: " + err.message);
          await clearSession(chatId);
        }
        break;

      case 'confirm':
        if (text.toLowerCase() === 'yes') {
          try {
            await queuePostJobs(
              {
                userId: session.userId || '',
                idea: session.idea || '',
                postType: session.postType || '',
                tone: session.tone || '',
                model: (session.model || 'openai') as 'openai' | 'anthropic'
              },
              session.generatedContent
            );
            await sendMessage(From, "Jobs queued! You'll be notified when published.");
          } catch (err) {
            console.error(err);
            await sendMessage(From, "Failed to queue jobs.");
          }
        } else {
          await sendMessage(From, "Publishing cancelled. Send /start to try again.");
        }
        await clearSession(chatId);
        break;
    }
  } catch (error) {
    console.error('[WhatsApp Webhook] Error:', error);
  }

  // Twilio requires a 200 OK or TwiML response
  res.status(200).send('<Response></Response>');
};
