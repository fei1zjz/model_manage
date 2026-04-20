# GPU Compute Platform - Database Schema

This directory contains the database schema and models for the GPU Compute Platform.

## Structure

```
.
├── prisma/
│   └── schema.prisma          # Prisma schema definition
├── src/
│   ├── db/
│   │   └── prisma.ts          # Prisma client wrapper
│   ├── models/
│   │   └── index.ts           # TypeScript interfaces with Zod validation
│   └── repositories/
│       ├── index.ts           # Repository exports
│       ├── server.repository.ts
│       ├── gpu.repository.ts
│       ├── allocation.repository.ts
│       ├── alert.repository.ts
│       ├── route-config.repository.ts
│       └── cluster.repository.ts
├── package.json
├── tsconfig.json
└── .env.example
```

## Models

### Server
- `id`: UUID (primary key)
- `name`: String (1-64 chars)
- `ip`: String (IPv4/IPv6)
- `port`: Integer (1-65535)
- `gpuCount`: Integer (>= 0)
- `gpuModel`: String
- `totalMemory`: BigInt
- `status`: Enum (ONLINE, OFFLINE, MAINTENANCE, ERROR)
- `createdAt`, `updatedAt`: DateTime

### GPU
- `id`: UUID (primary key)
- `serverId`: UUID (foreign key)
- `index`: Integer (0 to gpuCount-1)
- `model`: String
- `memory`: BigInt (> 0)
- `usedMemory`: BigInt (0 to memory)
- `status`: Enum (IDLE, BUSY, ERROR, RESERVED)
- `allocatedTo`: UUID (nullable, references Allocation)

### Allocation
- `id`: UUID (primary key)
- `userId`: UUID
- `gpuId`: UUID (foreign key)
- `serverId`: UUID (foreign key)
- `requestedAt`: DateTime
- `allocatedAt`: DateTime (nullable)
- `expiresAt`: DateTime (nullable)
- `status`: Enum (PENDING, ACTIVE, RELEASED, EXPIRED, FAILED)
- `metadata`: JSON

### Alert
- `id`: UUID (primary key)
- `ruleId`: UUID
- `severity`: Enum (INFO, WARNING, ERROR, CRITICAL)
- `source`: String
- `message`: String
- `triggeredAt`: DateTime
- `acknowledgedAt`: DateTime (nullable)
- `acknowledgedBy`: UUID (nullable)
- `status`: Enum (FIRING, RESOLVED, ACKNOWLEDGED)

### RouteConfig
- `id`: UUID (primary key)
- `name`: String (unique, 1-64 chars)
- `path`: String (starts with /)
- `method`: Enum (GET, POST, PUT, DELETE, PATCH, ANY)
- `upstream`: JSON (UpstreamConfig)
- `rateLimit`: JSON (nullable)
- `authRequired`: Boolean
- `timeout`: Integer (ms)
- `retryPolicy`: JSON (nullable)
- `version`: Integer

### Cluster
- `id`: UUID (primary key)
- `name`: String (unique, 1-64 chars)
- `apiServer`: String (URL)
- `kubeconfig`: String
- `version`: String (nullable)
- `nodeCount`: Integer
- `gpuNodeCount`: Integer
- `status`: Enum (HEALTHY, DEGRADED, UNHEALTHY, UNKNOWN)
- `labels`: JSON

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and update the database URL:
   ```bash
   cp .env.example .env
   ```

3. Generate Prisma client:
   ```bash
   npm run db:generate
   ```

4. Run migrations:
   ```bash
   npm run db:migrate
   ```

5. Push schema to database:
   ```bash
   npm run db:push
   ```

## Validation

All models include Zod schemas for runtime validation. Use the validation functions in `src/models/index.ts`:

```typescript
import { validateServer, validateGPU, validateCluster } from './src/models';

// Validate input
const server = validateServer(input);
const gpu = validateGPU(input);
const cluster = validateCluster(input);

// Safe validation (returns result instead of throwing)
const result = safeValidateServer(input);
if (result.success) {
  console.log(result.data);
} else {
  console.log(result.error);
}
```

## Repository Usage

```typescript
import { serverRepository, gpuRepository, allocationRepository } from './src/repositories';

// Create server
const server = await serverRepository.create({
  name: 'gpu-server-1',
  ip: '192.168.1.100',
  port: 8080,
  gpuCount: 4,
  gpuModel: 'NVIDIA-A100',
  totalMemory: BigInt(64000000000),
});

// Find servers
const servers = await serverRepository.findMany({ status: 'ONLINE' });

// Allocate GPU
const gpu = await gpuRepository.findAvailable('NVIDIA-A100', BigInt(16000000000));
await gpuRepository.updateStatus(gpu.id, 'BUSY', allocationId);
```