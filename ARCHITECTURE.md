# ARCHITECTURE.md

## Data Flow Diagram
```
User -> Telegram Bot (Webhook)
Telegram Bot -> API Server -> Services
Services -> AI Engine (OpenAI / Anthropic)
Services -> BullMQ (Redis)
BullMQ Worker -> Platform API -> Update DB
```

## Design Decisions
- **Express.js**: Used for simplicity and ecosystem maturity. Fastify could be used for higher throughput but Express is sufficient and well known.
- **BullMQ**: Required for reliable job processing with backoff support. Queue jobs are isolated per platform to prevent partial failure issues.
- **Telegram Webhooks**: Used to reduce polling overhead. Session is stored in Redis for stateful flow.
- **Prisma**: ORM of choice due to its strong typings and ease of migration management.

## Partial Failure Strategy
If a post fails on one platform but succeeds on another, the parent `Post` status is marked as `partial`. A retry endpoint is provided to requeue ONLY the `failed` platform jobs, ensuring no duplicates.
