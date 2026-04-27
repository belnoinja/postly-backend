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

## Telegram Bot Setup
1. Create a bot via BotFather on Telegram to get your `TELEGRAM_BOT_TOKEN`.
2. To use webhook mode locally, you can use ngrok to expose your local port 3000, then set the webhook url via:
   `curl -X POST https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook -d "url=https://<your-ngrok-url>/bot/telegram"`
