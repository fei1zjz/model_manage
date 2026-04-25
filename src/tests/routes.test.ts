import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

process.env.JWT_SECRET = "test-secret";

const mockGenerateToken = vi.hoisted(() => vi.fn(() => "generated-token"));
const mockBlacklistToken = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined),
);

vi.mock("../auth/jwt", () => ({
  authenticate: (req: any, _: any, next: any) => {
    req.user = { userId: "test-user", email: "test@test.com", role: "admin" };
    next();
  },
  requireRole:
    (..._roles: string[]) =>
    (_req: any, _: any, next: any) =>
      next(),
  generateToken: mockGenerateToken,
  blacklistToken: mockBlacklistToken,
  AuthenticatedRequest: Object,
}));

vi.mock("../middleware/audit", () => ({
  auditLog: (_req: any, _: any, next: any) => next(),
}));

const mockPublish = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockEventSubjects = vi.hoisted(() => ({
  SERVER_REGISTERED: "server.registered",
  SERVER_STATUS_CHANGED: "server.status.changed",
  ALLOCATION_CREATED: "allocation.created",
  ALLOCATION_RELEASED: "allocation.released",
  ALERT_TRIGGERED: "alert.triggered",
  WORKLOAD_DEPLOYED: "workload.deployed",
}));

vi.mock("../mq", () => ({
  publish: mockPublish,
  EventSubjects: mockEventSubjects,
}));

const mockUserSvc = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  listUsers: vi.fn(),
  updateRole: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock("../services/user.service", () => ({
  userService: mockUserSvc,
}));

const mockServerSvc = vi.hoisted(() => ({
  registerServer: vi.fn(),
  listServers: vi.fn(),
  getServer: vi.fn(),
  unregisterServer: vi.fn(),
  updateServerStatus: vi.fn(),
}));

vi.mock("../services/server.service", () => ({
  serverService: mockServerSvc,
}));

const mockAllocSvc = vi.hoisted(() => ({
  allocateGPU: vi.fn(),
  getUserAllocations: vi.fn(),
  releaseGPU: vi.fn(),
}));

vi.mock("../services/allocation.service", () => ({
  allocationService: mockAllocSvc,
}));

const mockGpuRepo = vi.hoisted(() => ({
  findByServerId: vi.fn(),
  createMany: vi.fn(),
  findAvailable: vi.fn(),
  updateStatus: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
}));

const mockAllocRepo = vi.hoisted(() => ({
  findMany: vi.fn(),
  findById: vi.fn(),
  updateStatus: vi.fn(),
  create: vi.fn(),
  countActiveByUserId: vi.fn(),
  findActiveByUserId: vi.fn(),
  findActiveByGpuId: vi.fn(),
  findByUserId: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteExpired: vi.fn(),
  findExpired: vi.fn(),
  count: vi.fn(),
}));

const mockClusterRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findMany: vi.fn(),
  findById: vi.fn(),
  delete: vi.fn(),
  hasActiveWorkloads: vi.fn(),
  updateStatus: vi.fn(),
  updateNodeCounts: vi.fn(),
  findByName: vi.fn(),
  update: vi.fn(),
}));

const mockAlertRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findMany: vi.fn(),
  findById: vi.fn(),
  acknowledge: vi.fn(),
  resolve: vi.fn(),
  findFiringByRuleAndSource: vi.fn(),
  findUnacknowledged: vi.fn(),
  update: vi.fn(),
  updateStatus: vi.fn(),
  delete: vi.fn(),
  deleteResolvedOlderThan: vi.fn(),
  countByStatus: vi.fn(),
}));

const mockRouteCfgRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findMany: vi.fn(),
  findById: vi.fn(),
  updateWithVersion: vi.fn(),
  delete: vi.fn(),
  findByName: vi.fn(),
  update: vi.fn(),
  findByPathAndMethod: vi.fn(),
}));

const mockServerRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateStatus: vi.fn(),
  delete: vi.fn(),
  hasActiveAllocations: vi.fn(),
  countByStatus: vi.fn(),
  findByName: vi.fn(),
  update: vi.fn(),
}));

vi.mock("../repositories", () => ({
  gpuRepository: mockGpuRepo,
  allocationRepository: mockAllocRepo,
  clusterRepository: mockClusterRepo,
  alertRepository: mockAlertRepo,
  routeConfigRepository: mockRouteCfgRepo,
  serverRepository: mockServerRepo,
}));

import authRouter from "../routes/auth";
import userRouter from "../routes/users";
import serverRouter from "../routes/servers";
import allocationRouter from "../routes/allocations";
import clusterRouter from "../routes/clusters";
import alertRouter from "../routes/alerts";
import routeConfigRouter from "../routes/routes";

function createApp() {
  const app = express();
  app.use(express.json());
  app.set("json replacer", function (_key: string, value: unknown) {
    if (typeof value === "bigint") return value.toString();
    return value;
  });
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/users", userRouter);
  app.use("/api/v1/servers", serverRouter);
  app.use("/api/v1/allocations", allocationRouter);
  app.use("/api/v1/clusters", clusterRouter);
  app.use("/api/v1/alerts", alertRouter);
  app.use("/api/v1/routes", routeConfigRouter);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Auth Routes", () => {
  const app = createApp();

  it("POST /api/v1/auth/register - success", async () => {
    const user = { id: "u1", email: "a@b.com", username: "t", role: "user" };
    mockUserSvc.register.mockResolvedValue(user);
    mockGenerateToken.mockReturnValue("jwt-token");

    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "a@b.com", username: "t", password: "secret123" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe("jwt-token");
    expect(res.body.data.user.email).toBe("a@b.com");
  });

  it("POST /api/v1/auth/register - validation error", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "bad" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/v1/auth/register - service error (duplicate)", async () => {
    mockUserSvc.register.mockRejectedValue(
      new Error("Email already registered"),
    );

    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "a@b.com", username: "t", password: "secret123" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Email already registered");
  });

  it("POST /api/v1/auth/login - success", async () => {
    const loginResult = {
      userId: "u1",
      email: "a@b.com",
      username: "t",
      role: "user",
    };
    mockUserSvc.login.mockResolvedValue(loginResult);
    mockGenerateToken.mockReturnValue("login-token");

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "a@b.com", password: "pw" });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBe("login-token");
  });

  it("POST /api/v1/auth/login - invalid credentials", async () => {
    mockUserSvc.login.mockRejectedValue(new Error("Invalid email or password"));

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "a@b.com", password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  it("POST /api/v1/auth/login - validation error", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/v1/auth/logout - blacklists token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", "Bearer some-token");

    expect(res.status).toBe(200);
    expect(mockBlacklistToken).toHaveBeenCalledWith("some-token", 86400);
  });
});

describe("User Routes", () => {
  const app = createApp();

  it("GET /api/v1/users/me - returns profile", async () => {
    mockUserSvc.getProfile.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      username: "t",
      role: "user",
      passwordHash: "xxx",
    });

    const res = await request(app).get("/api/v1/users/me");

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("a@b.com");
    expect(res.body.data).not.toHaveProperty("passwordHash");
  });

  it("GET /api/v1/users/me - not found", async () => {
    mockUserSvc.getProfile.mockRejectedValue(new Error("User not found"));

    const res = await request(app).get("/api/v1/users/me");

    expect(res.status).toBe(404);
  });

  it("PUT /api/v1/users/me - updates profile", async () => {
    mockUserSvc.updateProfile.mockResolvedValue({
      id: "u1",
      email: "new@b.com",
      username: "newname",
      role: "user",
    });

    const res = await request(app)
      .put("/api/v1/users/me")
      .send({ email: "new@b.com", username: "newname" });

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("new@b.com");
  });

  it("PUT /api/v1/users/me - validation error", async () => {
    const res = await request(app)
      .put("/api/v1/users/me")
      .send({ email: "bad" });

    expect(res.status).toBe(400);
  });

  it("PUT /api/v1/users/me/password - changes password", async () => {
    mockUserSvc.changePassword.mockResolvedValue(undefined);

    const res = await request(app)
      .put("/api/v1/users/me/password")
      .send({ oldPassword: "old", newPassword: "newpass123" });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it("PUT /api/v1/users/me/password - wrong old password", async () => {
    mockUserSvc.changePassword.mockRejectedValue(
      new Error("Current password is incorrect"),
    );

    const res = await request(app)
      .put("/api/v1/users/me/password")
      .send({ oldPassword: "wrong", newPassword: "new" });

    expect(res.status).toBe(400);
  });

  it("GET /api/v1/users - lists all users (admin)", async () => {
    mockUserSvc.listUsers.mockResolvedValue([
      { id: "u1", email: "a@b.com", username: "a", role: "user" },
    ]);

    const res = await request(app).get("/api/v1/users");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("PUT /api/v1/users/:id/role - updates role", async () => {
    mockUserSvc.updateRole.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      username: "a",
      role: "admin",
    });

    const res = await request(app)
      .put("/api/v1/users/u1/role")
      .send({ role: "admin" });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("admin");
  });

  it("PUT /api/v1/users/:id/role - not found", async () => {
    mockUserSvc.updateRole.mockRejectedValue(new Error("User not found"));

    const res = await request(app)
      .put("/api/v1/users/nonexistent/role")
      .send({ role: "admin" });

    expect(res.status).toBe(404);
  });

  it("DELETE /api/v1/users/:id - deletes user", async () => {
    mockUserSvc.deleteUser.mockResolvedValue(undefined);

    const res = await request(app).delete("/api/v1/users/u1");

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it("DELETE /api/v1/users/:id - not found", async () => {
    mockUserSvc.deleteUser.mockRejectedValue(new Error("User not found"));

    const res = await request(app).delete("/api/v1/users/nonexistent");

    expect(res.status).toBe(404);
  });
});

describe("Server Routes", () => {
  const app = createApp();

  it("POST /api/v1/servers - registers server", async () => {
    mockServerSvc.registerServer.mockResolvedValue({
      id: "s1",
      name: "my-server",
      status: "ONLINE",
    });

    const res = await request(app).post("/api/v1/servers").send({
      name: "my-server",
      ip: "10.0.0.1",
      port: 8080,
      gpuCount: 4,
      gpuModel: "A100",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("my-server");
  });

  it("GET /api/v1/servers - lists servers", async () => {
    mockServerSvc.listServers.mockResolvedValue([{ id: "s1", name: "s1" }]);

    const res = await request(app).get("/api/v1/servers");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("GET /api/v1/servers - filters by status", async () => {
    mockServerSvc.listServers.mockResolvedValue([]);

    await request(app).get("/api/v1/servers?status=ONLINE");

    expect(mockServerSvc.listServers).toHaveBeenCalledWith({
      status: "ONLINE",
    });
  });

  it("GET /api/v1/servers/:id - returns server", async () => {
    mockServerSvc.getServer.mockResolvedValue({ id: "s1", name: "s1" });

    const res = await request(app).get("/api/v1/servers/s1");

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("s1");
  });

  it("GET /api/v1/servers/:id - not found", async () => {
    mockServerSvc.getServer.mockRejectedValue(new Error("Server not found"));

    const res = await request(app).get("/api/v1/servers/nonexistent");

    expect(res.status).toBe(404);
  });

  it("DELETE /api/v1/servers/:id - unregisters", async () => {
    mockServerSvc.unregisterServer.mockResolvedValue(undefined);

    const res = await request(app).delete("/api/v1/servers/s1");

    expect(res.status).toBe(200);
  });

  it("DELETE /api/v1/servers/:id - active allocations conflict", async () => {
    mockServerSvc.unregisterServer.mockRejectedValue(
      new Error("Server has active allocations"),
    );

    const res = await request(app).delete("/api/v1/servers/s1");

    expect(res.status).toBe(409);
  });

  it("PATCH /api/v1/servers/:id/status - updates status", async () => {
    mockServerSvc.updateServerStatus.mockResolvedValue({
      id: "s1",
      status: "OFFLINE",
    });

    const res = await request(app)
      .patch("/api/v1/servers/s1/status")
      .send({ status: "OFFLINE" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("OFFLINE");
  });

  it("GET /api/v1/servers/:id/gpus - returns GPUs", async () => {
    mockGpuRepo.findByServerId.mockResolvedValue([
      { id: "g1", serverId: "s1" },
    ]);

    const res = await request(app).get("/api/v1/servers/s1/gpus");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe("Allocation Routes", () => {
  const app = createApp();

  it("POST /api/v1/allocations - creates allocation", async () => {
    mockAllocSvc.allocateGPU.mockResolvedValue({
      id: "a1",
      userId: "u1",
      status: "ACTIVE",
    });

    const res = await request(app).post("/api/v1/allocations").send({
      gpuModel: "A100",
      memoryRequired: "40000000000",
      durationSeconds: 3600,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("ACTIVE");
  });

  it("POST /api/v1/allocations - quota exceeded", async () => {
    mockAllocSvc.allocateGPU.mockRejectedValue(
      new Error("User quota exceeded"),
    );

    const res = await request(app).post("/api/v1/allocations").send({
      gpuModel: "A100",
      memoryRequired: "40000000000",
      durationSeconds: 3600,
    });

    expect(res.status).toBe(429);
  });

  it("POST /api/v1/allocations - no GPUs available", async () => {
    mockAllocSvc.allocateGPU.mockRejectedValue(
      new Error("No available GPU resources"),
    );

    const res = await request(app).post("/api/v1/allocations").send({
      gpuModel: "A100",
      memoryRequired: "40000000000",
      durationSeconds: 3600,
    });

    expect(res.status).toBe(503);
  });

  it("GET /api/v1/allocations - admin sees all", async () => {
    mockAllocRepo.findMany.mockResolvedValue([{ id: "a1", userId: "u1" }]);

    const res = await request(app).get("/api/v1/allocations");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("DELETE /api/v1/allocations/:id - releases allocation", async () => {
    mockAllocSvc.releaseGPU.mockResolvedValue(undefined);

    const res = await request(app).delete("/api/v1/allocations/a1");

    expect(res.status).toBe(200);
  });

  it("DELETE /api/v1/allocations/:id - unauthorized", async () => {
    mockAllocSvc.releaseGPU.mockRejectedValue(new Error("Unauthorized"));

    const res = await request(app).delete("/api/v1/allocations/a1");

    expect(res.status).toBe(403);
  });

  it("DELETE /api/v1/allocations/:id - not found", async () => {
    mockAllocSvc.releaseGPU.mockRejectedValue(
      new Error("Allocation not found"),
    );

    const res = await request(app).delete("/api/v1/allocations/nonexistent");

    expect(res.status).toBe(404);
  });
});

describe("Cluster Routes", () => {
  const app = createApp();

  it("POST /api/v1/clusters - creates cluster", async () => {
    mockClusterRepo.create.mockResolvedValue({
      id: "c1",
      name: "my-cluster",
      status: "UNKNOWN",
    });

    const res = await request(app).post("/api/v1/clusters").send({
      name: "my-cluster",
      apiServer: "https://10.0.0.1:6443",
      kubeconfig: "...",
      version: "1.28",
      labels: null,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("my-cluster");
  });

  it("POST /api/v1/clusters - validation error", async () => {
    const res = await request(app).post("/api/v1/clusters").send({});

    expect(res.status).toBe(400);
  });

  it("GET /api/v1/clusters - lists clusters", async () => {
    mockClusterRepo.findMany.mockResolvedValue([{ id: "c1", name: "c1" }]);

    const res = await request(app).get("/api/v1/clusters");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("GET /api/v1/clusters - filters by status", async () => {
    mockClusterRepo.findMany.mockResolvedValue([]);

    await request(app).get("/api/v1/clusters?status=HEALTHY");

    expect(mockClusterRepo.findMany).toHaveBeenCalledWith({
      status: "HEALTHY",
    });
  });

  it("GET /api/v1/clusters/:id - returns cluster", async () => {
    mockClusterRepo.findById.mockResolvedValue({ id: "c1", name: "c1" });

    const res = await request(app).get("/api/v1/clusters/c1");

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("c1");
  });

  it("GET /api/v1/clusters/:id - not found", async () => {
    mockClusterRepo.findById.mockResolvedValue(null);

    const res = await request(app).get("/api/v1/clusters/nonexistent");

    expect(res.status).toBe(404);
  });

  it("DELETE /api/v1/clusters/:id - deletes cluster", async () => {
    mockClusterRepo.hasActiveWorkloads.mockResolvedValue(false);
    mockClusterRepo.delete.mockResolvedValue(undefined);

    const res = await request(app).delete("/api/v1/clusters/c1");

    expect(res.status).toBe(200);
  });

  it("DELETE /api/v1/clusters/:id - has active workloads", async () => {
    mockClusterRepo.hasActiveWorkloads.mockResolvedValue(true);

    const res = await request(app).delete("/api/v1/clusters/c1");

    expect(res.status).toBe(409);
  });

  it("PATCH /api/v1/clusters/:id/status - updates status", async () => {
    mockClusterRepo.updateStatus.mockResolvedValue({
      id: "c1",
      status: "DEGRADED",
    });

    const res = await request(app)
      .patch("/api/v1/clusters/c1/status")
      .send({ status: "DEGRADED" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("DEGRADED");
  });

  it("PATCH /api/v1/clusters/:id/status - invalid status", async () => {
    const res = await request(app)
      .patch("/api/v1/clusters/c1/status")
      .send({ status: "INVALID" });

    expect(res.status).toBe(400);
  });

  it("GET /api/v1/clusters/:id/metrics - returns metrics", async () => {
    mockClusterRepo.findById.mockResolvedValue({
      id: "c1",
      nodeCount: 10,
      gpuNodeCount: 4,
    });

    const res = await request(app).get("/api/v1/clusters/c1/metrics");

    expect(res.status).toBe(200);
    expect(res.body.data.nodeCount).toBe(10);
    expect(res.body.data.availableGpus).toBe(4);
  });

  it("GET /api/v1/clusters/:id/metrics - not found", async () => {
    mockClusterRepo.findById.mockResolvedValue(null);

    const res = await request(app).get("/api/v1/clusters/nonexistent/metrics");

    expect(res.status).toBe(404);
  });

  it("POST /api/v1/clusters/:id/workloads - deploys workload", async () => {
    mockClusterRepo.findById.mockResolvedValue({ id: "c1", status: "HEALTHY" });
    mockPublish.mockResolvedValue(undefined);

    const res = await request(app).post("/api/v1/clusters/c1/workloads").send({
      name: "my-app",
      namespace: "default",
      image: "nginx:latest",
      replicas: 3,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("my-app");
    expect(res.body.data.replicas).toBe(3);
  });

  it("POST /api/v1/clusters/:id/workloads - cluster not found", async () => {
    mockClusterRepo.findById.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/v1/clusters/nonexistent/workloads")
      .send({ name: "app", namespace: "default", image: "img", replicas: 1 });

    expect(res.status).toBe(404);
  });

  it("POST /api/v1/clusters/:id/workloads - cluster not healthy", async () => {
    mockClusterRepo.findById.mockResolvedValue({
      id: "c1",
      status: "DEGRADED",
    });

    const res = await request(app)
      .post("/api/v1/clusters/c1/workloads")
      .send({ name: "app", namespace: "default", image: "img", replicas: 1 });

    expect(res.status).toBe(422);
  });

  it("PATCH /api/v1/clusters/:id/workloads/:workloadId/scale - scales workload", async () => {
    const res = await request(app)
      .patch("/api/v1/clusters/c1/workloads/wl-1/scale")
      .send({ replicas: 5 });

    expect(res.status).toBe(200);
    expect(res.body.data.replicas).toBe(5);
  });
});

describe("Alert Routes", () => {
  const app = createApp();

  it("POST /api/v1/alerts/rules - creates alert rule", async () => {
    mockAlertRepo.findFiringByRuleAndSource.mockResolvedValue(null);
    mockAlertRepo.create.mockResolvedValue({
      id: "alert-1",
      ruleId: "00000000-0000-0000-0000-000000000001",
      severity: "WARNING",
      source: "server-1",
      message: "High memory",
      status: "FIRING",
    });

    const res = await request(app).post("/api/v1/alerts/rules").send({
      ruleId: "00000000-0000-0000-0000-000000000001",
      severity: "WARNING",
      source: "server-1",
      message: "High memory",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("FIRING");
  });

  it("POST /api/v1/alerts/rules - duplicate firing alert", async () => {
    mockAlertRepo.findFiringByRuleAndSource.mockResolvedValue({
      id: "existing",
    });

    const res = await request(app).post("/api/v1/alerts/rules").send({
      ruleId: "00000000-0000-0000-0000-000000000001",
      severity: "WARNING",
      source: "server-1",
      message: "High memory",
    });

    expect(res.status).toBe(409);
  });

  it("GET /api/v1/alerts - lists alerts", async () => {
    mockAlertRepo.findMany.mockResolvedValue([{ id: "a1", status: "FIRING" }]);

    const res = await request(app).get("/api/v1/alerts");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("GET /api/v1/alerts - with filters", async () => {
    mockAlertRepo.findMany.mockResolvedValue([]);

    await request(app).get("/api/v1/alerts?severity=WARNING&status=FIRING");

    expect(mockAlertRepo.findMany).toHaveBeenCalled();
  });

  it("POST /api/v1/alerts/:id/acknowledge - acknowledges alert", async () => {
    mockAlertRepo.acknowledge.mockResolvedValue({
      id: "a1",
      status: "ACKNOWLEDGED",
    });

    const res = await request(app)
      .post("/api/v1/alerts/a1/acknowledge")
      .send({ acknowledgedBy: "user-1" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ACKNOWLEDGED");
  });

  it("POST /api/v1/alerts/:id/acknowledge - missing acknowledgedBy", async () => {
    const res = await request(app)
      .post("/api/v1/alerts/a1/acknowledge")
      .send({});

    expect(res.status).toBe(400);
  });

  it("POST /api/v1/alerts/:id/resolve - resolves alert", async () => {
    mockAlertRepo.resolve.mockResolvedValue({
      id: "a1",
      status: "RESOLVED",
    });

    const res = await request(app).post("/api/v1/alerts/a1/resolve");

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("RESOLVED");
  });
});

describe("Route Config Routes", () => {
  const app = createApp();

  it("POST /api/v1/routes - creates route config", async () => {
    mockRouteCfgRepo.create.mockResolvedValue({
      id: "r1",
      name: "my-route",
      path: "/api/test",
      method: "GET",
      version: 1,
    });

    const res = await request(app)
      .post("/api/v1/routes")
      .send({
        name: "my-route",
        path: "/api/test",
        method: "GET",
        upstream: { targets: [{ host: "10.0.0.1", port: 8080 }] },
        rateLimit: null,
        retryPolicy: null,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("my-route");
  });

  it("POST /api/v1/routes - validation error", async () => {
    const res = await request(app).post("/api/v1/routes").send({});

    expect(res.status).toBe(400);
  });

  it("GET /api/v1/routes - lists routes", async () => {
    mockRouteCfgRepo.findMany.mockResolvedValue([{ id: "r1", name: "r1" }]);

    const res = await request(app).get("/api/v1/routes");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("GET /api/v1/routes - with filters", async () => {
    mockRouteCfgRepo.findMany.mockResolvedValue([]);

    await request(app).get("/api/v1/routes?name=test&method=GET");

    expect(mockRouteCfgRepo.findMany).toHaveBeenCalledWith({
      name: "test",
      method: "GET",
    });
  });

  it("GET /api/v1/routes/:id - returns route", async () => {
    mockRouteCfgRepo.findById.mockResolvedValue({ id: "r1", name: "r1" });

    const res = await request(app).get("/api/v1/routes/r1");

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("r1");
  });

  it("GET /api/v1/routes/:id - not found", async () => {
    mockRouteCfgRepo.findById.mockResolvedValue(null);

    const res = await request(app).get("/api/v1/routes/nonexistent");

    expect(res.status).toBe(404);
  });

  it("PUT /api/v1/routes/:id - updates route", async () => {
    mockRouteCfgRepo.updateWithVersion.mockResolvedValue({
      id: "r1",
      name: "updated",
      version: 2,
    });

    const res = await request(app)
      .put("/api/v1/routes/r1")
      .send({ name: "updated" });

    expect(res.status).toBe(200);
    expect(res.body.data.version).toBe(2);
  });

  it("PUT /api/v1/routes/:id - not found", async () => {
    mockRouteCfgRepo.updateWithVersion.mockRejectedValue(
      new Error("Route not found"),
    );

    const res = await request(app)
      .put("/api/v1/routes/nonexistent")
      .send({ name: "updated" });

    expect(res.status).toBe(404);
  });

  it("DELETE /api/v1/routes/:id - deletes route", async () => {
    mockRouteCfgRepo.delete.mockResolvedValue(undefined);

    const res = await request(app).delete("/api/v1/routes/r1");

    expect(res.status).toBe(200);
  });
});
