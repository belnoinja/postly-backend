# AI Usage Document

## Section: JWT Auth System & Middlewares
**Tool:** Antigravity (Deepmind AI)
**Task:** Scaffolding the Auth flow and token utilities.
**Prompt used:** "Implement JWT auth registration, login and verify middleware with AES-256 for secrets."
**What I changed/validated:** Integrated with Prisma user model and ensured the hash comparisons matched the expected output formats.

## Section: Telegram Bot Stateful Session
**Tool:** Antigravity (Deepmind AI)
**Task:** Storing telegram bot multi-step state in Redis.
**Prompt used:** "Write a Telegram bot stateful flow utilizing node-telegram-bot-api and ioredis."
**What I changed/validated:** Validated the state transitions and matched them precisely to the PRD requirement (Tone, AI Model, Platforms).

## Section: BullMQ Publishing Queue
**Tool:** Antigravity (Deepmind AI)
**Task:** Implement robust queue processing for multiple platforms.
**Prompt used:** "Implement a BullMQ worker to handle per-platform social media publishing with exponential backoff."
**What I changed/validated:** Adjusted to update the parent post state to "partial" if only a subset of platform jobs succeed.
