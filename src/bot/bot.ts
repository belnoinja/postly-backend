import TelegramBot from 'node-telegram-bot-api';
import { getSession, saveSession, clearSession, BotSession } from './state';
import { generateContent } from '../services/ai';
import prisma from '../db/client';

const token = process.env.TELEGRAM_BOT_TOKEN || 'test_token';
export const bot = new TelegramBot(token);

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';

  // Commands
  if (text === '/start' || text === '/post') {
    await clearSession(chatId);
    
    // Check if user is linked (mock userId for now, ideally linked via some OAuth or email process)
    const user = await prisma.user.findFirst(); // For testing/demo purposes since there's no auth in telegram bot natively yet
    if (!user) {
      bot.sendMessage(chatId, "No users in DB. Please register via API first.");
      return;
    }

    await saveSession(chatId, { step: 'type', userId: user.id });
    const opts = {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Announcement', callback_data: 'type:announcement' }, { text: 'Thread', callback_data: 'type:thread' }],
          [{ text: 'Story', callback_data: 'type:story' }, { text: 'Promotional', callback_data: 'type:promotional' }],
          [{ text: 'Educational', callback_data: 'type:educational' }, { text: 'Opinion', callback_data: 'type:opinion' }]
        ]
      }
    };
    bot.sendMessage(chatId, `Hey 👋 What type of post is this?`, opts);
    return;
  }
  
  if (text === '/status') {
     bot.sendMessage(chatId, "Status command not fully implemented yet.");
     return;
  }
  
  if (text === '/accounts') {
     bot.sendMessage(chatId, "Accounts command not fully implemented yet.");
     return;
  }

  // Handle Idea Input
  const session = await getSession(chatId);
  if (session && session.step === 'idea') {
    if (text.length > 500) {
      bot.sendMessage(chatId, `Your idea is too long (${text.length} chars). Please keep it under 500 characters.`);
      return;
    }

    session.idea = text;
    session.step = 'confirm';
    await saveSession(chatId, session);

    bot.sendMessage(chatId, "Generating your content... ⚙️");

    try {
      const result = await generateContent({
        userId: session.userId!,
        idea: session.idea,
        postType: session.postType!,
        platforms: session.platforms!,
        tone: session.tone!,
        language: 'en',
        model: session.model!
      });

      session.generatedContent = result.generated;
      await saveSession(chatId, session);

      let preview = '';
      if (result.generated.twitter) preview += `📱 Twitter/X:\n${result.generated.twitter.content}\n\n`;
      if (result.generated.linkedin) preview += `💼 LinkedIn:\n${result.generated.linkedin.content}\n\n`;
      if (result.generated.instagram) preview += `📸 Instagram:\n${result.generated.instagram.content}\n\n`;
      if (result.generated.threads) preview += `🧵 Threads:\n${result.generated.threads.content}\n\n`;

      const opts = {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Yes, Post Now', callback_data: 'confirm:yes' }],
            [{ text: '✏️ Edit Idea', callback_data: 'confirm:edit' }, { text: '❌ Cancel', callback_data: 'confirm:cancel' }]
          ]
        }
      };

      bot.sendMessage(chatId, `${preview}Confirm and post?`, opts);
    } catch (e: any) {
      console.error(e);
      bot.sendMessage(chatId, "Something went wrong generating content. Please try again.");
      await clearSession(chatId);
    }
    return;
  }

  // If mid-flow and unexpected text
  if (session && session.step !== 'idea') {
     bot.sendMessage(chatId, "I didn't get that — please choose one of the options 👆");
  }
});

bot.on('callback_query', async (query) => {
  const chatId = query.message?.chat.id;
  if (!chatId) return;

  const data = query.data;
  const session = await getSession(chatId);

  if (!session) {
    bot.sendMessage(chatId, "Your session timed out. Send /post to start again.");
    return;
  }

  if (data?.startsWith('type:')) {
    session.postType = data.split(':')[1];
    session.step = 'platforms';
    session.platforms = [];
    await saveSession(chatId, session);

    const opts = {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Twitter/X', callback_data: 'plat:twitter' }, { text: 'LinkedIn', callback_data: 'plat:linkedin' }],
          [{ text: 'Instagram', callback_data: 'plat:instagram' }, { text: 'Threads', callback_data: 'plat:threads' }],
          [{ text: '➡️ Continue', callback_data: 'plat:done' }]
        ]
      }
    };
    bot.sendMessage(chatId, "Which platforms should I post to? (Select and then Continue)", opts);
  } else if (data?.startsWith('plat:')) {
    const plat = data.split(':')[1];
    if (plat === 'done') {
      if (!session.platforms || session.platforms.length === 0) {
         bot.sendMessage(chatId, "Please select at least one platform before continuing.");
         return;
      }
      session.step = 'tone';
      await saveSession(chatId, session);

      const opts = {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Professional', callback_data: 'tone:professional' }, { text: 'Casual', callback_data: 'tone:casual' }],
            [{ text: 'Witty', callback_data: 'tone:witty' }, { text: 'Authoritative', callback_data: 'tone:authoritative' }],
            [{ text: 'Friendly', callback_data: 'tone:friendly' }]
          ]
        }
      };
      bot.sendMessage(chatId, "What tone should the content have?", opts);
    } else {
      if (!session.platforms) session.platforms = [];
      if (!session.platforms.includes(plat)) {
        session.platforms.push(plat);
        await saveSession(chatId, session);
      }
      bot.answerCallbackQuery(query.id, { text: `Added ${plat}` });
    }
  } else if (data?.startsWith('tone:')) {
    session.tone = data.split(':')[1];
    session.step = 'model';
    await saveSession(chatId, session);

    const opts = {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'GPT-4o (OpenAI)', callback_data: 'model:openai' }],
          [{ text: 'Claude Sonnet (Anthropic)', callback_data: 'model:anthropic' }]
        ]
      }
    };
    bot.sendMessage(chatId, "Which AI model do you want to use?", opts);
  } else if (data?.startsWith('model:')) {
    session.model = data.split(':')[1] as 'openai' | 'anthropic';
    session.step = 'idea';
    await saveSession(chatId, session);
    
    bot.sendMessage(chatId, "Tell me the idea or core message — keep it brief.");
  } else if (data?.startsWith('confirm:')) {
    const action = data.split(':')[1];
    if (action === 'cancel') {
      await clearSession(chatId);
      bot.sendMessage(chatId, "Cancelled. Send /post to start again.");
    } else if (action === 'edit') {
      session.step = 'idea';
      await saveSession(chatId, session);
      bot.sendMessage(chatId, "Tell me the idea or core message — keep it brief.");
    } else if (action === 'yes') {
      bot.sendMessage(chatId, "Jobs queued! You'll be notified when published.");
      // TODO: Queue BullMQ Jobs here
      await clearSession(chatId);
    }
  }
});
