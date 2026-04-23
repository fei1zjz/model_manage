# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Compile TypeScript to dist/
npm test             # Run tests once
npm run test:watch   # Run tests in watch mode
npm run test:coverage
npm run lint         # ESLint on src/
npm run format       # Prettier

npm run prisma:generate  # Regenerate Prisma client after schema changes
npm run prisma:migrate   # Run pending migrations
npm run prisma:push      # Push schema without migration (dev only)
npm run prisma:studio    # Open Prisma Studio UI
```

Run a single test file: `npx vitest run src/tests/jwt.test.ts`

## Architecture

Layered: **Routes → Services → Repositories → Prisma → PostgreSQL**, with Redis (cache/token blacklist) and NATS (async events) as side channels.

```
src/
  routes/       # Express routers, input validation via Zod, auth middleware applied here
  services/     # Business logic (allocation scoring, quota enforcement)
  repositories/ # All DB access via Prisma — one file per domain model
  models/       # Zod schemas + TypeScript interfaces for all domain types
  auth/         # JWT issue/verify/blacklist, RBAC middleware factory
  cache/        # Redis singleton with reconnect logic, TTL constants
  mq/           # NATS client, event publishing
  db/           # Prisma client singleton
  middleware/   # Audit logging
```

## Key Patterns

- **Repository pattern** — never call Prisma directly from routes or services; go through `src/repositories/`
- **Zod validation** — validate all external input at the route layer using schemas from `src/models/index.ts` before passing to services
- **Redis blacklist** — JWT logout stores token in Redis; middleware checks blacklist on every request (non-blocking, fails open)
- **NATS events** — allocation create/release publishes events; consumers are external to this repo
- **Singletons** — Redis and Prisma clients are module-level singletons; don't instantiate new clients

## Environment

Copy `.env.example` to `.env`. Required vars: `DATABASE_URL`, `REDIS_URL`, `NATS_URL`, `JWT_SECRET`.
