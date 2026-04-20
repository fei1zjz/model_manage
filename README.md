# GPU Compute Platform

A REST API platform for managing GPU compute resources, including server inventory, GPU allocation, Kubernetes cluster management, API gateway routing, and alerting.

## Tech Stack

- **Runtime**: Node.js 18+ / TypeScript
- **Framework**: Express
- **Database**: PostgreSQL via Prisma ORM
- **Cache**: Redis (ioredis)
- **Message Queue**: NATS
- **Auth**: JWT (jsonwebtoken) + RBAC
- **Validation**: Zod
- **Testing**: Vitest

## Project Structure

```
.
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── index.ts               # Express app entry point
│   ├── auth/
│   │   ├── jwt.ts             # JWT generation, verification, blacklisting
│   │   ├── middleware.ts      # Auth middleware
│   │   └── quota.ts           # User quota enforcement
│   ├── cache/
│   │   ├── client.ts          # Redis singleton client
│   │   ├── helpers.ts         # Cache get/set/delete utilities
│   │   └── types.ts           # Cache namespaces and TTL constants
│   ├── db/
│   │   └── prisma.ts          # Prisma client wrapper
│   ├── middleware/
│   │   └── audit.ts           # Request audit logging
│   ├── models/
│   │   └── index.ts           # TypeScript interfaces + Zod schemas
│   ├── mq/
│   │   └── index.ts           # NATS client and message publishing
│   ├── repositories/
│   │   ├── server.repository.ts
│   │   ├── gpu.repository.ts
│   │   ├── allocation.repository.ts
│   │   ├── alert.repository.ts
│   │   ├── route-config.repository.ts
│   │   └── cluster.repository.ts
│   ├── routes/
│   │   ├── auth.ts            # POST /auth/login, /auth/logout
│   │   ├── servers.ts         # Server CRUD
│   │   ├── allocations.ts     # GPU allocation lifecycle
│   │   ├── alerts.ts          # Alert management
│   │   ├── clusters.ts        # K8s cluster management
│   │   └── routes.ts          # API gateway route config
│   ├── services/              # Business logic services
│   └── tests/
│       ├── jwt.test.ts
│       └── cache-helpers.test.ts
├── .eslintrc.json
├── tsconfig.json
└── .env.example
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/login` | — | Issue JWT token |
| POST | `/api/v1/auth/logout` | ✓ | Blacklist token |
| GET | `/api/v1/servers` | ✓ | List servers |
| POST | `/api/v1/servers` | admin | Create server |
| GET | `/api/v1/servers/:id` | ✓ | Get server |
| PUT | `/api/v1/servers/:id` | admin | Update server |
| DELETE | `/api/v1/servers/:id` | admin | Delete server |
| GET | `/api/v1/allocations` | ✓ | List allocations |
| POST | `/api/v1/allocations` | ✓ | Request GPU allocation |
| DELETE | `/api/v1/allocations/:id` | ✓ | Release allocation |
| GET | `/api/v1/alerts` | ✓ | List alerts |
| POST | `/api/v1/alerts/:id/acknowledge` | ✓ | Acknowledge alert |
| GET | `/api/v1/clusters` | ✓ | List clusters |
| POST | `/api/v1/clusters` | admin | Register cluster |
| GET | `/api/v1/clusters/:id` | ✓ | Get cluster |
| PUT | `/api/v1/clusters/:id` | admin | Update cluster |
| DELETE | `/api/v1/clusters/:id` | admin | Delete cluster |
| GET | `/api/v1/routes` | ✓ | List route configs |
| POST | `/api/v1/routes` | admin | Create route config |
| PUT | `/api/v1/routes/:id` | admin | Update route config |
| DELETE | `/api/v1/routes/:id` | admin | Delete route config |
| GET | `/health` | — | Health check |

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy and configure environment:
   ```bash
   cp .env.example .env
   # Edit .env: DATABASE_URL, REDIS_URL, NATS_URL, JWT_SECRET
   ```

3. Generate Prisma client and run migrations:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   npm start
   ```

## Testing & Linting

```bash
npm run test        # Run tests (vitest)
npm run lint        # ESLint
npm run format      # Prettier
```

## Models

### Server
`id`, `name`, `ip`, `port`, `gpuCount`, `gpuModel`, `totalMemory`, `status` (ONLINE/OFFLINE/MAINTENANCE/ERROR)

### GPU
`id`, `serverId`, `index`, `model`, `memory`, `usedMemory`, `status` (IDLE/BUSY/ERROR/RESERVED), `allocatedTo`

### Allocation
`id`, `userId`, `gpuId`, `serverId`, `requestedAt`, `allocatedAt`, `expiresAt`, `status` (PENDING/ACTIVE/RELEASED/EXPIRED/FAILED), `metadata`

### Alert
`id`, `ruleId`, `severity` (INFO/WARNING/ERROR/CRITICAL), `source`, `message`, `triggeredAt`, `status` (FIRING/RESOLVED/ACKNOWLEDGED)

### RouteConfig
`id`, `name`, `path`, `method` (GET/POST/PUT/DELETE/PATCH/ANY), `upstream`, `rateLimit`, `authRequired`, `timeout`, `retryPolicy`, `version`

### Cluster
`id`, `name`, `apiServer`, `kubeconfig`, `version`, `nodeCount`, `gpuNodeCount`, `status` (HEALTHY/DEGRADED/UNHEALTHY/UNKNOWN), `labels`
