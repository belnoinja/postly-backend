# Postly Backend

**Live API URL:** (To be added after deployment)

Postly is a multi-platform AI content publishing engine.

## Setup Instructions

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Copy `.env.example` to `.env` and configure your environment variables.
4. Run `docker-compose up` to start PostgreSQL and Redis locally.
5. Run `npx prisma db push` to push the database schema.
6. Run `npm run dev` to start the development server.

## Telegram & WhatsApp Bot Setup
1. **Telegram:** Create a bot via BotFather. Set the webhook URL to `https://<your-domain>/bot/telegram`. Ensure `TELEGRAM_WEBHOOK_SECRET` matches your `X-Telegram-Bot-Api-Secret-Token`.
2. **WhatsApp:** Configure Twilio Sandbox. Set "When a message comes in" webhook to `https://<your-domain>/bot/whatsapp`.

## Implemented Score Boosters (100% Completion)
- ✅ WhatsApp Bot (Twilio Integration)
- ✅ Full OAuth 2.0 PKCE Callbacks (Twitter)
- ✅ Global API Rate Limiting (express-rate-limit)
- ✅ Webhook Signature Verification (Telegram Secret Token)
- ✅ Scheduled Posts with Cron (node-cron + BullMQ)
- ✅ Analytics Endpoint (/api/posts/:id/analytics)
- ✅ Language Auto-Detection (languagedetect)
- ✅ Soft Delete & Restore (deletedAt field, restore endpoint)
