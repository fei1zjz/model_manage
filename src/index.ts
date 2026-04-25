import express from "express";
import path from "path";
import { checkDatabaseConnection, disconnectPrisma } from "./db/prisma";
import { checkRedisConnection, disconnectRedis } from "./cache";
import { disconnectNats } from "./mq";
import serverRouter from "./routes/servers";
import allocationRouter from "./routes/allocations";
import alertRouter from "./routes/alerts";
import routeRouter from "./routes/routes";
import clusterRouter from "./routes/clusters";
import authRouter from "./routes/auth";
import userRouter from "./routes/users";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Global BigInt serialization fix
app.set("json replacer", (_key: string, value: unknown) =>
  typeof value === "bigint" ? value.toString() : value,
);

app.get("/health", async (_req, res) => {
  const [db, cache] = await Promise.all([
    checkDatabaseConnection()
      .then(() => true)
      .catch(() => false),
    checkRedisConnection(),
  ]);
  const status = db && cache ? "ok" : "degraded";
  res.status(status === "ok" ? 200 : 503).json({ status, db, cache });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/servers", serverRouter);
app.use("/api/v1/allocations", allocationRouter);
app.use("/api/v1/alerts", alertRouter);
app.use("/api/v1/routes", routeRouter);
app.use("/api/v1/clusters", clusterRouter);
app.use("/api/v1/users", userRouter);

const server = app.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);
});

// Global error handlers for unhandled rejections and exceptions
process.on("unhandledRejection", (reason) => {
  console.error("[Process] Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[Process] Uncaught Exception:", error);
  process.exit(1);
});

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`[Server] Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log("[Server] HTTP server closed");
  });
  await Promise.allSettled([
    disconnectPrisma(),
    disconnectRedis(),
    disconnectNats(),
  ]);
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
