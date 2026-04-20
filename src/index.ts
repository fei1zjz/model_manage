import express from 'express';
import { checkDatabaseConnection } from './db/prisma';
import { checkRedisConnection } from './cache';
import serverRouter from './routes/servers';
import allocationRouter from './routes/allocations';
import alertRouter from './routes/alerts';
import routeRouter from './routes/routes';
import clusterRouter from './routes/clusters';
import authRouter from './routes/auth';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', async (_req, res) => {
  const [db, cache] = await Promise.all([
    checkDatabaseConnection().then(() => true).catch(() => false),
    checkRedisConnection(),
  ]);
  const status = db && cache ? 'ok' : 'degraded';
  res.status(status === 'ok' ? 200 : 503).json({ status, db, cache });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/servers', serverRouter);
app.use('/api/v1/allocations', allocationRouter);
app.use('/api/v1/alerts', alertRouter);
app.use('/api/v1/routes', routeRouter);
app.use('/api/v1/clusters', clusterRouter);

app.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);
});

export default app;
