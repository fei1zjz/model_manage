import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  server: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    groupBy: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  gPU: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    groupBy: vi.fn(),
    deleteMany: vi.fn(),
    createManyAndReturn: vi.fn(),
    count: vi.fn(),
  },
  allocation: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    groupBy: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  alert: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    groupBy: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  routeConfig: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    groupBy: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  cluster: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    groupBy: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    groupBy: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  $disconnect: vi.fn(),
  $queryRaw: vi.fn(),
}));

vi.mock("../db/prisma", () => ({
  default: mockPrisma,
}));

const realDate = new Date("2026-01-01T00:00:00Z");

import {
  ServerRepository,
  serverRepository,
} from "../repositories/server.repository";
import { GPURepository, gpuRepository } from "../repositories/gpu.repository";
import {
  AllocationRepository,
  allocationRepository,
} from "../repositories/allocation.repository";
import {
  AlertRepository,
  alertRepository,
} from "../repositories/alert.repository";
import {
  RouteConfigRepository,
  routeConfigRepository,
} from "../repositories/route-config.repository";
import {
  ClusterRepository,
  clusterRepository,
} from "../repositories/cluster.repository";
import {
  UserRepository,
  userRepository,
} from "../repositories/user.repository";

describe("ServerRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockServer = {
    id: "server-1",
    name: "test-server",
    ip: "10.0.0.1",
    port: 8080,
    gpuCount: 4,
    gpuModel: "A100",
    totalMemory: BigInt("80000000000"),
    status: "ONLINE",
    createdAt: realDate,
    updatedAt: realDate,
  };

  it("create calls prisma.server.create with correct data", async () => {
    mockPrisma.server.create.mockResolvedValue(mockServer);
    const result = await serverRepository.create({
      name: "test-server",
      ip: "10.0.0.1",
      port: 8080,
      gpuCount: 4,
      gpuModel: "A100",
      totalMemory: BigInt("80000000000"),
    });
    expect(mockPrisma.server.create).toHaveBeenCalledWith({
      data: {
        name: "test-server",
        ip: "10.0.0.1",
        port: 8080,
        gpuCount: 4,
        gpuModel: "A100",
        totalMemory: BigInt("80000000000"),
        status: "OFFLINE",
      },
    });
    expect(result).toEqual(mockServer);
  });

  it("create uses provided status", async () => {
    mockPrisma.server.create.mockResolvedValue({
      ...mockServer,
      status: "ONLINE",
    });
    await serverRepository.create({
      name: "s1",
      ip: "1.1.1.1",
      port: 80,
      gpuCount: 2,
      gpuModel: "V100",
      totalMemory: BigInt("40000000000"),
      status: "ONLINE",
    });
    expect(mockPrisma.server.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: "ONLINE" }),
    });
  });

  it("findById returns server when found", async () => {
    mockPrisma.server.findUnique.mockResolvedValue(mockServer);
    const result = await serverRepository.findById("server-1");
    expect(mockPrisma.server.findUnique).toHaveBeenCalledWith({
      where: { id: "server-1" },
    });
    expect(result).toEqual(mockServer);
  });

  it("findById returns null when not found", async () => {
    mockPrisma.server.findUnique.mockResolvedValue(null);
    const result = await serverRepository.findById("nonexistent");
    expect(result).toBeNull();
  });

  it("findByName returns server when found", async () => {
    mockPrisma.server.findFirst.mockResolvedValue(mockServer);
    const result = await serverRepository.findByName("test-server");
    expect(mockPrisma.server.findFirst).toHaveBeenCalledWith({
      where: { name: "test-server" },
    });
    expect(result).toEqual(mockServer);
  });

  it("findByName returns null when not found", async () => {
    mockPrisma.server.findFirst.mockResolvedValue(null);
    const result = await serverRepository.findByName("nonexistent");
    expect(result).toBeNull();
  });

  it("findMany returns all servers when no filter", async () => {
    mockPrisma.server.findMany.mockResolvedValue([mockServer]);
    const result = await serverRepository.findMany();
    expect(mockPrisma.server.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: "desc" },
    });
    expect(result).toEqual([mockServer]);
  });

  it("findMany applies status filter", async () => {
    mockPrisma.server.findMany.mockResolvedValue([mockServer]);
    await serverRepository.findMany({ status: "ONLINE" });
    expect(mockPrisma.server.findMany).toHaveBeenCalledWith({
      where: { status: "ONLINE" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("findMany applies gpuModel filter", async () => {
    mockPrisma.server.findMany.mockResolvedValue([]);
    await serverRepository.findMany({ gpuModel: "A100" });
    expect(mockPrisma.server.findMany).toHaveBeenCalledWith({
      where: { gpuModel: "A100" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("findMany applies name filter (case insensitive)", async () => {
    mockPrisma.server.findMany.mockResolvedValue([]);
    await serverRepository.findMany({ name: "test" });
    expect(mockPrisma.server.findMany).toHaveBeenCalledWith({
      where: { name: { contains: "test", mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
    });
  });

  it("update calls prisma.server.update with correct data", async () => {
    mockPrisma.server.update.mockResolvedValue(mockServer);
    const result = await serverRepository.update("server-1", {
      name: "updated",
    });
    expect(mockPrisma.server.update).toHaveBeenCalledWith({
      where: { id: "server-1" },
      data: {
        name: "updated",
        ip: undefined,
        port: undefined,
        gpuCount: undefined,
        gpuModel: undefined,
        totalMemory: undefined,
        status: undefined,
      },
    });
    expect(result).toEqual(mockServer);
  });

  it("updateStatus updates and returns server", async () => {
    mockPrisma.server.update.mockResolvedValue({
      ...mockServer,
      status: "OFFLINE",
    });
    const result = await serverRepository.updateStatus("server-1", "OFFLINE");
    expect(mockPrisma.server.update).toHaveBeenCalledWith({
      where: { id: "server-1" },
      data: { status: "OFFLINE" },
    });
    expect(result.status).toBe("OFFLINE");
  });

  it("delete calls prisma.server.delete", async () => {
    mockPrisma.server.delete.mockResolvedValue(mockServer);
    await serverRepository.delete("server-1");
    expect(mockPrisma.server.delete).toHaveBeenCalledWith({
      where: { id: "server-1" },
    });
  });

  it("hasActiveAllocations returns true when active allocation exists", async () => {
    mockPrisma.allocation.findFirst.mockResolvedValue({ id: "alloc-1" });
    const result = await serverRepository.hasActiveAllocations("server-1");
    expect(mockPrisma.allocation.findFirst).toHaveBeenCalledWith({
      where: { serverId: "server-1", status: "ACTIVE" },
    });
    expect(result).toBe(true);
  });

  it("hasActiveAllocations returns false when no active allocation", async () => {
    mockPrisma.allocation.findFirst.mockResolvedValue(null);
    const result = await serverRepository.hasActiveAllocations("server-1");
    expect(result).toBe(false);
  });

  it("countByStatus returns counts grouped by status", async () => {
    mockPrisma.server.groupBy.mockResolvedValue([
      { status: "ONLINE", _count: 5 },
      { status: "OFFLINE", _count: 3 },
    ]);
    const result = await serverRepository.countByStatus();
    expect(mockPrisma.server.groupBy).toHaveBeenCalledWith({
      by: ["status"],
      _count: true,
    });
    expect(result).toEqual({ ONLINE: 5, OFFLINE: 3, MAINTENANCE: 0, ERROR: 0 });
  });

  it("countByStatus returns all zeros when no servers", async () => {
    mockPrisma.server.groupBy.mockResolvedValue([]);
    const result = await serverRepository.countByStatus();
    expect(result).toEqual({ ONLINE: 0, OFFLINE: 0, MAINTENANCE: 0, ERROR: 0 });
  });
});

describe("GPURepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockGPU = {
    id: "gpu-1",
    serverId: "server-1",
    index: 0,
    model: "A100",
    memory: BigInt("40000000000"),
    usedMemory: BigInt("0"),
    status: "IDLE",
    allocatedTo: null,
  };

  it("create calls prisma.gPU.create with correct data", async () => {
    mockPrisma.gPU.create.mockResolvedValue(mockGPU);
    const result = await gpuRepository.create({
      serverId: "server-1",
      index: 0,
      model: "A100",
      memory: BigInt("40000000000"),
    });
    expect(mockPrisma.gPU.create).toHaveBeenCalledWith({
      data: {
        serverId: "server-1",
        index: 0,
        model: "A100",
        memory: BigInt("40000000000"),
        usedMemory: BigInt(0),
        status: "IDLE",
        allocatedTo: undefined,
      },
    });
    expect(result).toEqual(mockGPU);
  });

  it("createMany creates multiple GPUs", async () => {
    const gpus = Array.from({ length: 3 }, (_, i) => ({
      ...mockGPU,
      id: `gpu-${i}`,
      index: i,
    }));
    mockPrisma.gPU.createManyAndReturn.mockResolvedValue(gpus);
    const result = await gpuRepository.createMany(
      "server-1",
      "A100",
      BigInt("40000000000"),
      3,
    );
    expect(mockPrisma.gPU.createManyAndReturn).toHaveBeenCalledWith({
      data: [
        {
          serverId: "server-1",
          index: 0,
          model: "A100",
          memory: BigInt("40000000000"),
          usedMemory: BigInt(0),
          status: "IDLE",
          allocatedTo: null,
        },
        {
          serverId: "server-1",
          index: 1,
          model: "A100",
          memory: BigInt("40000000000"),
          usedMemory: BigInt(0),
          status: "IDLE",
          allocatedTo: null,
        },
        {
          serverId: "server-1",
          index: 2,
          model: "A100",
          memory: BigInt("40000000000"),
          usedMemory: BigInt(0),
          status: "IDLE",
          allocatedTo: null,
        },
      ],
    });
    expect(result).toHaveLength(3);
    expect(result[0].index).toBe(0);
    expect(result[2].index).toBe(2);
  });

  it("findById returns GPU when found", async () => {
    mockPrisma.gPU.findUnique.mockResolvedValue(mockGPU);
    const result = await gpuRepository.findById("gpu-1");
    expect(mockPrisma.gPU.findUnique).toHaveBeenCalledWith({
      where: { id: "gpu-1" },
    });
    expect(result).toEqual(mockGPU);
  });

  it("findById returns null when not found", async () => {
    mockPrisma.gPU.findUnique.mockResolvedValue(null);
    const result = await gpuRepository.findById("nonexistent");
    expect(result).toBeNull();
  });

  it("findByServerAndIndex finds GPU by composite key", async () => {
    mockPrisma.gPU.findUnique.mockResolvedValue(mockGPU);
    const result = await gpuRepository.findByServerAndIndex("server-1", 0);
    expect(mockPrisma.gPU.findUnique).toHaveBeenCalledWith({
      where: { serverId_index: { serverId: "server-1", index: 0 } },
    });
    expect(result).toEqual(mockGPU);
  });

  it("findByServerId returns GPUs for a server", async () => {
    const gpus = [mockGPU, { ...mockGPU, id: "gpu-2", index: 1 }];
    mockPrisma.gPU.findMany.mockResolvedValue(gpus);
    const result = await gpuRepository.findByServerId("server-1");
    expect(mockPrisma.gPU.findMany).toHaveBeenCalledWith({
      where: { serverId: "server-1" },
      orderBy: { index: "asc" },
    });
    expect(result).toHaveLength(2);
  });

  it("findAvailable returns idle GPUs without filters", async () => {
    mockPrisma.gPU.findMany.mockResolvedValue([mockGPU]);
    const result = await gpuRepository.findAvailable();
    expect(mockPrisma.gPU.findMany).toHaveBeenCalledWith({
      where: { status: "IDLE" },
      include: { server: true },
      orderBy: { index: "asc" },
    });
    expect(result).toEqual([mockGPU]);
  });

  it("findAvailable filters by gpuModel", async () => {
    mockPrisma.gPU.findMany.mockResolvedValue([]);
    await gpuRepository.findAvailable("V100");
    expect(mockPrisma.gPU.findMany).toHaveBeenCalledWith({
      where: { status: "IDLE", model: "V100" },
      include: { server: true },
      orderBy: { index: "asc" },
    });
  });

  it("findAvailable filters by minMemory", async () => {
    mockPrisma.gPU.findMany.mockResolvedValue([]);
    await gpuRepository.findAvailable(undefined, BigInt("100000000000"));
    const call = mockPrisma.gPU.findMany.mock.calls[0][0];
    expect(call.where.memory.gte).toBe(BigInt("100000000000"));
  });

  it("update calls prisma.gPU.update", async () => {
    mockPrisma.gPU.update.mockResolvedValue({ ...mockGPU, model: "V100" });
    const result = await gpuRepository.update("gpu-1", { model: "V100" });
    expect(mockPrisma.gPU.update).toHaveBeenCalledWith({
      where: { id: "gpu-1" },
      data: {
        model: "V100",
        memory: undefined,
        usedMemory: undefined,
        status: undefined,
        allocatedTo: undefined,
      },
    });
    expect(result.model).toBe("V100");
  });

  it("updateStatus updates GPU status without allocatedTo", async () => {
    mockPrisma.gPU.update.mockResolvedValue({ ...mockGPU, status: "BUSY" });
    await gpuRepository.updateStatus("gpu-1", "BUSY");
    expect(mockPrisma.gPU.update).toHaveBeenCalledWith({
      where: { id: "gpu-1" },
      data: { status: "BUSY", allocatedTo: undefined },
    });
  });

  it("updateStatus updates GPU status with allocatedTo", async () => {
    mockPrisma.gPU.update.mockResolvedValue({
      ...mockGPU,
      status: "BUSY",
      allocatedTo: "alloc-1",
    });
    await gpuRepository.updateStatus("gpu-1", "BUSY", "alloc-1");
    expect(mockPrisma.gPU.update).toHaveBeenCalledWith({
      where: { id: "gpu-1" },
      data: { status: "BUSY", allocatedTo: "alloc-1" },
    });
  });

  it("updateStatus resets allocatedTo when passed null", async () => {
    mockPrisma.gPU.update.mockResolvedValue({
      ...mockGPU,
      status: "IDLE",
      allocatedTo: null,
    });
    await gpuRepository.updateStatus("gpu-1", "IDLE", null);
    expect(mockPrisma.gPU.update).toHaveBeenCalledWith({
      where: { id: "gpu-1" },
      data: { status: "IDLE", allocatedTo: null },
    });
  });

  it("updateMemoryUsage updates used memory", async () => {
    mockPrisma.gPU.update.mockResolvedValue({
      ...mockGPU,
      usedMemory: BigInt("5000000000"),
    });
    const result = await gpuRepository.updateMemoryUsage(
      "gpu-1",
      BigInt("5000000000"),
    );
    expect(mockPrisma.gPU.update).toHaveBeenCalledWith({
      where: { id: "gpu-1" },
      data: { usedMemory: BigInt("5000000000") },
    });
    expect(result.usedMemory).toBe(BigInt("5000000000"));
  });

  it("delete calls prisma.gPU.delete", async () => {
    mockPrisma.gPU.delete.mockResolvedValue(mockGPU);
    await gpuRepository.delete("gpu-1");
    expect(mockPrisma.gPU.delete).toHaveBeenCalledWith({
      where: { id: "gpu-1" },
    });
  });

  it("deleteByServerId calls prisma.gPU.deleteMany", async () => {
    mockPrisma.gPU.deleteMany.mockResolvedValue({ count: 4 });
    await gpuRepository.deleteByServerId("server-1");
    expect(mockPrisma.gPU.deleteMany).toHaveBeenCalledWith({
      where: { serverId: "server-1" },
    });
  });

  it("countByStatus returns counts grouped by status", async () => {
    mockPrisma.gPU.groupBy.mockResolvedValue([
      { status: "IDLE", _count: 10 },
      { status: "BUSY", _count: 5 },
    ]);
    const result = await gpuRepository.countByStatus("server-1");
    expect(mockPrisma.gPU.groupBy).toHaveBeenCalledWith({
      by: ["status"],
      where: { serverId: "server-1" },
      _count: true,
    });
    expect(result).toEqual({ IDLE: 10, BUSY: 5, ERROR: 0, RESERVED: 0 });
  });

  it("countByStatus returns all zeros when no GPUs", async () => {
    mockPrisma.gPU.groupBy.mockResolvedValue([]);
    const result = await gpuRepository.countByStatus("server-1");
    expect(result).toEqual({ IDLE: 0, BUSY: 0, ERROR: 0, RESERVED: 0 });
  });
});

describe("AllocationRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAllocation = {
    id: "alloc-1",
    userId: "user-1",
    gpuId: "gpu-1",
    serverId: "server-1",
    requestedAt: realDate,
    allocatedAt: realDate,
    expiresAt: new Date("2026-01-02T00:00:00Z"),
    status: "ACTIVE",
    metadata: null,
  };

  it("create calls prisma.allocation.create", async () => {
    mockPrisma.allocation.create.mockResolvedValue(mockAllocation);
    const result = await allocationRepository.create({
      userId: "user-1",
      gpuId: "gpu-1",
      serverId: "server-1",
      allocatedAt: realDate,
      expiresAt: new Date("2026-01-02T00:00:00Z"),
    });
    expect(mockPrisma.allocation.create).toHaveBeenCalled();
    expect(result).toEqual(mockAllocation);
  });

  it("create includes metadata when provided", async () => {
    mockPrisma.allocation.create.mockResolvedValue({
      ...mockAllocation,
      metadata: { key: "val" },
    });
    await allocationRepository.create({
      userId: "u1",
      gpuId: "g1",
      serverId: "s1",
      allocatedAt: realDate,
      expiresAt: realDate,
      status: "PENDING",
      metadata: { key: "val" },
    });
    const callData = mockPrisma.allocation.create.mock.calls[0][0].data;
    expect(callData.metadata).toEqual({ key: "val" });
    expect(callData.status).toBe("PENDING");
  });

  it("findById returns allocation when found", async () => {
    mockPrisma.allocation.findUnique.mockResolvedValue(mockAllocation);
    const result = await allocationRepository.findById("alloc-1");
    expect(mockPrisma.allocation.findUnique).toHaveBeenCalledWith({
      where: { id: "alloc-1" },
    });
    expect(result).toEqual(mockAllocation);
  });

  it("findById returns null when not found", async () => {
    mockPrisma.allocation.findUnique.mockResolvedValue(null);
    const result = await allocationRepository.findById("nonexistent");
    expect(result).toBeNull();
  });

  it("findActiveByGpuId returns active allocation", async () => {
    mockPrisma.allocation.findFirst.mockResolvedValue(mockAllocation);
    const result = await allocationRepository.findActiveByGpuId("gpu-1");
    expect(mockPrisma.allocation.findFirst).toHaveBeenCalledWith({
      where: { gpuId: "gpu-1", status: "ACTIVE" },
    });
    expect(result).toEqual(mockAllocation);
  });

  it("findByUserId returns user allocations", async () => {
    mockPrisma.allocation.findMany.mockResolvedValue([mockAllocation]);
    const result = await allocationRepository.findByUserId("user-1");
    expect(mockPrisma.allocation.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { requestedAt: "desc" },
    });
    expect(result).toHaveLength(1);
  });

  it("findActiveByUserId returns active allocations only", async () => {
    mockPrisma.allocation.findMany.mockResolvedValue([mockAllocation]);
    const result = await allocationRepository.findActiveByUserId("user-1");
    expect(mockPrisma.allocation.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", status: "ACTIVE" },
      orderBy: { allocatedAt: "desc" },
    });
    expect(result).toHaveLength(1);
  });

  it("countActiveByUserId returns count", async () => {
    mockPrisma.allocation.count.mockResolvedValue(3);
    const result = await allocationRepository.countActiveByUserId("user-1");
    expect(mockPrisma.allocation.count).toHaveBeenCalledWith({
      where: { userId: "user-1", status: "ACTIVE" },
    });
    expect(result).toBe(3);
  });

  it("findMany applies all filters", async () => {
    mockPrisma.allocation.findMany.mockResolvedValue([mockAllocation]);
    await allocationRepository.findMany({
      userId: "user-1",
      gpuId: "gpu-1",
      serverId: "server-1",
      status: "ACTIVE",
    });
    expect(mockPrisma.allocation.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        gpuId: "gpu-1",
        serverId: "server-1",
        status: "ACTIVE",
      },
      orderBy: { requestedAt: "desc" },
    });
  });

  it("findMany with empty filter returns all", async () => {
    mockPrisma.allocation.findMany.mockResolvedValue([]);
    await allocationRepository.findMany({});
    expect(mockPrisma.allocation.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { requestedAt: "desc" },
    });
  });

  it("findExpired returns expired allocations", async () => {
    mockPrisma.allocation.findMany.mockResolvedValue([mockAllocation]);
    const result = await allocationRepository.findExpired();
    const call = mockPrisma.allocation.findMany.mock.calls[0][0];
    expect(call.where.status).toBe("ACTIVE");
    expect(call.where.expiresAt.lt).toBeInstanceOf(Date);
    expect(result).toEqual([mockAllocation]);
  });

  it("update calls prisma.allocation.update", async () => {
    mockPrisma.allocation.update.mockResolvedValue(mockAllocation);
    const result = await allocationRepository.update("alloc-1", {
      status: "RELEASED",
    });
    expect(mockPrisma.allocation.update).toHaveBeenCalledWith({
      where: { id: "alloc-1" },
      data: {
        allocatedAt: undefined,
        expiresAt: undefined,
        status: "RELEASED",
        metadata: undefined,
      },
    });
    expect(result).toEqual(mockAllocation);
  });

  it("updateStatus updates allocation status", async () => {
    mockPrisma.allocation.update.mockResolvedValue({
      ...mockAllocation,
      status: "RELEASED",
    });
    const result = await allocationRepository.updateStatus(
      "alloc-1",
      "RELEASED",
    );
    expect(mockPrisma.allocation.update).toHaveBeenCalledWith({
      where: { id: "alloc-1" },
      data: { status: "RELEASED" },
    });
    expect(result.status).toBe("RELEASED");
  });

  it("delete calls prisma.allocation.delete", async () => {
    mockPrisma.allocation.delete.mockResolvedValue(mockAllocation);
    await allocationRepository.delete("alloc-1");
    expect(mockPrisma.allocation.delete).toHaveBeenCalledWith({
      where: { id: "alloc-1" },
    });
  });

  it("deleteExpired deletes old resolved allocations", async () => {
    mockPrisma.allocation.deleteMany.mockResolvedValue({ count: 5 });
    const result = await allocationRepository.deleteExpired(
      new Date("2025-01-01"),
    );
    expect(mockPrisma.allocation.deleteMany).toHaveBeenCalledWith({
      where: {
        status: { in: ["RELEASED", "EXPIRED", "FAILED"] },
        requestedAt: { lt: new Date("2025-01-01") },
      },
    });
    expect(result).toBe(5);
  });
});

describe("AlertRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAlert = {
    id: "alert-1",
    ruleId: "rule-1",
    severity: "WARNING" as const,
    source: "server-1",
    message: "High memory usage",
    triggeredAt: realDate,
    acknowledgedAt: null,
    acknowledgedBy: null,
    status: "FIRING" as const,
  };

  it("create calls prisma.alert.create", async () => {
    mockPrisma.alert.create.mockResolvedValue(mockAlert);
    const result = await alertRepository.create({
      ruleId: "rule-1",
      severity: "WARNING",
      source: "server-1",
      message: "High memory usage",
    });
    const callData = mockPrisma.alert.create.mock.calls[0][0].data;
    expect(callData.ruleId).toBe("rule-1");
    expect(callData.severity).toBe("WARNING");
    expect(callData.status).toBe("FIRING");
    expect(result).toEqual(mockAlert);
  });

  it("findById returns alert when found", async () => {
    mockPrisma.alert.findUnique.mockResolvedValue(mockAlert);
    const result = await alertRepository.findById("alert-1");
    expect(mockPrisma.alert.findUnique).toHaveBeenCalledWith({
      where: { id: "alert-1" },
    });
    expect(result).toEqual(mockAlert);
  });

  it("findById returns null when not found", async () => {
    mockPrisma.alert.findUnique.mockResolvedValue(null);
    const result = await alertRepository.findById("nonexistent");
    expect(result).toBeNull();
  });

  it("findFiringByRuleAndSource returns firing alert", async () => {
    mockPrisma.alert.findFirst.mockResolvedValue(mockAlert);
    const result = await alertRepository.findFiringByRuleAndSource(
      "rule-1",
      "server-1",
    );
    expect(mockPrisma.alert.findFirst).toHaveBeenCalledWith({
      where: { ruleId: "rule-1", source: "server-1", status: "FIRING" },
    });
    expect(result).toEqual(mockAlert);
  });

  it("findMany applies all filters", async () => {
    mockPrisma.alert.findMany.mockResolvedValue([mockAlert]);
    await alertRepository.findMany({
      ruleId: "rule-1",
      severity: "WARNING",
      source: "server",
      status: "FIRING",
      from: new Date("2025-01-01"),
      to: new Date("2026-01-01"),
    });
    const call = mockPrisma.alert.findMany.mock.calls[0][0];
    expect(call.where.ruleId).toBe("rule-1");
    expect(call.where.severity).toBe("WARNING");
    expect(call.where.source).toEqual({
      contains: "server",
      mode: "insensitive",
    });
    expect(call.where.status).toBe("FIRING");
    expect(call.where.triggeredAt.gte).toEqual(new Date("2025-01-01"));
    expect(call.where.triggeredAt.lte).toEqual(new Date("2026-01-01"));
  });

  it("findMany with no filter returns all", async () => {
    mockPrisma.alert.findMany.mockResolvedValue([]);
    await alertRepository.findMany({});
    const call = mockPrisma.alert.findMany.mock.calls[0][0];
    expect(call.where).toEqual({});
  });

  it("findUnacknowledged returns unacknowledged firing alerts", async () => {
    mockPrisma.alert.findMany.mockResolvedValue([mockAlert]);
    const result = await alertRepository.findUnacknowledged();
    expect(mockPrisma.alert.findMany).toHaveBeenCalledWith({
      where: { status: "FIRING", acknowledgedAt: null },
      orderBy: { triggeredAt: "desc" },
    });
    expect(result).toEqual([mockAlert]);
  });

  it("update calls prisma.alert.update", async () => {
    mockPrisma.alert.update.mockResolvedValue({
      ...mockAlert,
      message: "Updated",
    });
    const result = await alertRepository.update("alert-1", {
      message: "Updated",
    });
    expect(mockPrisma.alert.update).toHaveBeenCalled();
    expect(result.message).toBe("Updated");
  });

  it("acknowledge updates alert status and timestamp", async () => {
    mockPrisma.alert.update.mockResolvedValue({
      ...mockAlert,
      status: "ACKNOWLEDGED",
      acknowledgedAt: new Date(),
      acknowledgedBy: "user-1",
    });
    const result = await alertRepository.acknowledge("alert-1", "user-1");
    expect(mockPrisma.alert.update).toHaveBeenCalledWith({
      where: { id: "alert-1" },
      data: {
        acknowledgedAt: expect.any(Date),
        acknowledgedBy: "user-1",
        status: "ACKNOWLEDGED",
      },
    });
    expect(result.status).toBe("ACKNOWLEDGED");
  });

  it("updateStatus calls prisma.alert.update", async () => {
    mockPrisma.alert.update.mockResolvedValue({
      ...mockAlert,
      status: "RESOLVED",
    });
    const result = await alertRepository.updateStatus("alert-1", "RESOLVED");
    expect(result.status).toBe("RESOLVED");
  });

  it("resolve sets status to RESOLVED", async () => {
    mockPrisma.alert.update.mockResolvedValue({
      ...mockAlert,
      status: "RESOLVED",
    });
    const result = await alertRepository.resolve("alert-1");
    expect(mockPrisma.alert.update).toHaveBeenCalledWith({
      where: { id: "alert-1" },
      data: { status: "RESOLVED" },
    });
    expect(result.status).toBe("RESOLVED");
  });

  it("delete calls prisma.alert.delete", async () => {
    mockPrisma.alert.delete.mockResolvedValue(mockAlert);
    await alertRepository.delete("alert-1");
    expect(mockPrisma.alert.delete).toHaveBeenCalledWith({
      where: { id: "alert-1" },
    });
  });

  it("deleteResolvedOlderThan deletes old resolved alerts", async () => {
    mockPrisma.alert.deleteMany.mockResolvedValue({ count: 10 });
    const result = await alertRepository.deleteResolvedOlderThan(
      new Date("2025-06-01"),
    );
    expect(mockPrisma.alert.deleteMany).toHaveBeenCalledWith({
      where: {
        status: "RESOLVED",
        triggeredAt: { lt: new Date("2025-06-01") },
      },
    });
    expect(result).toBe(10);
  });

  it("countByStatus returns counts", async () => {
    mockPrisma.alert.groupBy.mockResolvedValue([
      { status: "FIRING", _count: 7 },
      { status: "RESOLVED", _count: 3 },
    ]);
    const result = await alertRepository.countByStatus();
    expect(mockPrisma.alert.groupBy).toHaveBeenCalledWith({
      by: ["status"],
      _count: true,
    });
    expect(result).toEqual({ FIRING: 7, RESOLVED: 3, ACKNOWLEDGED: 0 });
  });
});

describe("RouteConfigRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRoute = {
    id: "route-1",
    name: "test-route",
    path: "/api/test",
    method: "GET",
    upstream: { host: "localhost", port: 3001 },
    rateLimit: { enabled: false },
    authRequired: true,
    timeout: 30000,
    retryPolicy: { attempts: 3 },
    createdAt: realDate,
    updatedAt: realDate,
    version: 1,
  };

  it("create calls prisma.routeConfig.create", async () => {
    mockPrisma.routeConfig.create.mockResolvedValue(mockRoute);
    const result = await routeConfigRepository.create({
      name: "test-route",
      path: "/api/test",
      method: "GET",
    });
    expect(mockPrisma.routeConfig.create).toHaveBeenCalled();
    expect(result).toEqual(mockRoute);
  });

  it("create with all optional fields", async () => {
    mockPrisma.routeConfig.create.mockResolvedValue(mockRoute);
    await routeConfigRepository.create({
      name: "full-route",
      path: "/api/full",
      method: "POST",
      upstream: { host: "svc", port: 8080 },
      authRequired: true,
      timeout: 60000,
      rateLimit: { enabled: true, max: 100 },
      retryPolicy: { attempts: 5 },
      version: 2,
    });
    const data = mockPrisma.routeConfig.create.mock.calls[0][0].data;
    expect(data.name).toBe("full-route");
    expect(data.version).toBe(2);
    expect(data.authRequired).toBe(true);
    expect(data.timeout).toBe(60000);
  });

  it("findById returns route when found", async () => {
    mockPrisma.routeConfig.findUnique.mockResolvedValue(mockRoute);
    const result = await routeConfigRepository.findById("route-1");
    expect(mockPrisma.routeConfig.findUnique).toHaveBeenCalledWith({
      where: { id: "route-1" },
    });
    expect(result).toEqual(mockRoute);
  });

  it("findById returns null when not found", async () => {
    mockPrisma.routeConfig.findUnique.mockResolvedValue(null);
    const result = await routeConfigRepository.findById("nonexistent");
    expect(result).toBeNull();
  });

  it("findByName returns route when found", async () => {
    mockPrisma.routeConfig.findUnique.mockResolvedValue(mockRoute);
    const result = await routeConfigRepository.findByName("test-route");
    expect(mockPrisma.routeConfig.findUnique).toHaveBeenCalledWith({
      where: { name: "test-route" },
    });
    expect(result).toEqual(mockRoute);
  });

  it("findMany applies filters", async () => {
    mockPrisma.routeConfig.findMany.mockResolvedValue([mockRoute]);
    await routeConfigRepository.findMany({
      name: "test",
      path: "/api",
      method: "GET",
    });
    const call = mockPrisma.routeConfig.findMany.mock.calls[0][0];
    expect(call.where.name).toEqual({ contains: "test", mode: "insensitive" });
    expect(call.where.path).toEqual({ contains: "/api", mode: "insensitive" });
    expect(call.where.method).toBe("GET");
  });

  it("findMany with empty filter returns all", async () => {
    mockPrisma.routeConfig.findMany.mockResolvedValue([]);
    await routeConfigRepository.findMany({});
    const call = mockPrisma.routeConfig.findMany.mock.calls[0][0];
    expect(call.where).toEqual({});
  });

  it("update calls prisma.routeConfig.update", async () => {
    mockPrisma.routeConfig.update.mockResolvedValue(mockRoute);
    const result = await routeConfigRepository.update("route-1", {
      timeout: 60000,
    });
    expect(mockPrisma.routeConfig.update).toHaveBeenCalled();
    expect(result).toEqual(mockRoute);
  });

  it("updateWithVersion increments version", async () => {
    mockPrisma.routeConfig.findUnique.mockResolvedValue({
      ...mockRoute,
      version: 1,
    });
    mockPrisma.routeConfig.update.mockResolvedValue({
      ...mockRoute,
      version: 2,
    });
    const result = await routeConfigRepository.updateWithVersion("route-1", {
      timeout: 60000,
    });
    expect(mockPrisma.routeConfig.findUnique).toHaveBeenCalledWith({
      where: { id: "route-1" },
    });
    expect(mockPrisma.routeConfig.update).toHaveBeenCalledWith({
      where: { id: "route-1" },
      data: expect.objectContaining({ version: 2 }),
    });
    expect(result.version).toBe(2);
  });

  it("updateWithVersion throws when route not found", async () => {
    mockPrisma.routeConfig.findUnique.mockResolvedValue(null);
    await expect(
      routeConfigRepository.updateWithVersion("nonexistent", {}),
    ).rejects.toThrow("Route not found");
  });

  it("delete calls prisma.routeConfig.delete", async () => {
    mockPrisma.routeConfig.delete.mockResolvedValue(mockRoute);
    await routeConfigRepository.delete("route-1");
    expect(mockPrisma.routeConfig.delete).toHaveBeenCalledWith({
      where: { id: "route-1" },
    });
  });

  it("findByPathAndMethod finds route by path and method", async () => {
    mockPrisma.routeConfig.findFirst.mockResolvedValue(mockRoute);
    const result = await routeConfigRepository.findByPathAndMethod(
      "/api/test",
      "GET",
    );
    expect(mockPrisma.routeConfig.findFirst).toHaveBeenCalledWith({
      where: { path: "/api/test", method: "GET" },
    });
    expect(result).toEqual(mockRoute);
  });
});

describe("ClusterRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCluster = {
    id: "cluster-1",
    name: "test-cluster",
    apiServer: "https://10.0.0.1:6443",
    kubeconfig: "apiVersion: v1\nkind: Config\n",
    version: "1.28",
    nodeCount: 10,
    gpuNodeCount: 4,
    status: "HEALTHY",
    labels: { region: "us-east-1" },
    createdAt: realDate,
    updatedAt: realDate,
  };

  it("create calls prisma.cluster.create", async () => {
    mockPrisma.cluster.create.mockResolvedValue(mockCluster);
    const result = await clusterRepository.create({
      name: "test-cluster",
      apiServer: "https://10.0.0.1:6443",
      kubeconfig: "...",
      version: "1.28",
    });
    expect(mockPrisma.cluster.create).toHaveBeenCalled();
    expect(result).toEqual(mockCluster);
  });

  it("create with all optional fields", async () => {
    mockPrisma.cluster.create.mockResolvedValue(mockCluster);
    await clusterRepository.create({
      name: "c1",
      apiServer: "https://1.1.1.1",
      kubeconfig: "...",
      version: "1.27",
      nodeCount: 5,
      gpuNodeCount: 2,
      status: "DEGRADED",
      labels: { env: "prod" },
    });
    const data = mockPrisma.cluster.create.mock.calls[0][0].data;
    expect(data.nodeCount).toBe(5);
    expect(data.gpuNodeCount).toBe(2);
    expect(data.status).toBe("DEGRADED");
    expect(data.labels).toEqual({ env: "prod" });
  });

  it("findById returns cluster when found", async () => {
    mockPrisma.cluster.findUnique.mockResolvedValue(mockCluster);
    const result = await clusterRepository.findById("cluster-1");
    expect(mockPrisma.cluster.findUnique).toHaveBeenCalledWith({
      where: { id: "cluster-1" },
    });
    expect(result).toEqual(mockCluster);
  });

  it("findById returns null when not found", async () => {
    mockPrisma.cluster.findUnique.mockResolvedValue(null);
    const result = await clusterRepository.findById("nonexistent");
    expect(result).toBeNull();
  });

  it("findByName returns cluster when found", async () => {
    mockPrisma.cluster.findUnique.mockResolvedValue(mockCluster);
    const result = await clusterRepository.findByName("test-cluster");
    expect(mockPrisma.cluster.findUnique).toHaveBeenCalledWith({
      where: { name: "test-cluster" },
    });
    expect(result).toEqual(mockCluster);
  });

  it("findMany applies filters", async () => {
    mockPrisma.cluster.findMany.mockResolvedValue([mockCluster]);
    await clusterRepository.findMany({ status: "HEALTHY", name: "test" });
    const call = mockPrisma.cluster.findMany.mock.calls[0][0];
    expect(call.where.status).toBe("HEALTHY");
    expect(call.where.name).toEqual({ contains: "test", mode: "insensitive" });
  });

  it("findMany with label filter", async () => {
    mockPrisma.cluster.findMany.mockResolvedValue([]);
    await clusterRepository.findMany({ labels: { region: "us-east-1" } });
    const call = mockPrisma.cluster.findMany.mock.calls[0][0];
    expect(call.where.labels).toEqual({ region: "us-east-1" });
  });

  it("findMany with no filter returns all", async () => {
    mockPrisma.cluster.findMany.mockResolvedValue([]);
    await clusterRepository.findMany({});
    const call = mockPrisma.cluster.findMany.mock.calls[0][0];
    expect(call.where).toEqual({});
  });

  it("update calls prisma.cluster.update", async () => {
    mockPrisma.cluster.update.mockResolvedValue(mockCluster);
    const result = await clusterRepository.update("cluster-1", {
      nodeCount: 20,
    });
    expect(mockPrisma.cluster.update).toHaveBeenCalled();
    expect(result).toEqual(mockCluster);
  });

  it("updateStatus updates cluster status", async () => {
    mockPrisma.cluster.update.mockResolvedValue({
      ...mockCluster,
      status: "DEGRADED",
    });
    const result = await clusterRepository.updateStatus(
      "cluster-1",
      "DEGRADED",
    );
    expect(mockPrisma.cluster.update).toHaveBeenCalledWith({
      where: { id: "cluster-1" },
      data: { status: "DEGRADED" },
    });
    expect(result.status).toBe("DEGRADED");
  });

  it("updateNodeCounts updates node counts", async () => {
    mockPrisma.cluster.update.mockResolvedValue({
      ...mockCluster,
      nodeCount: 15,
      gpuNodeCount: 8,
    });
    const result = await clusterRepository.updateNodeCounts("cluster-1", 15, 8);
    expect(mockPrisma.cluster.update).toHaveBeenCalledWith({
      where: { id: "cluster-1" },
      data: { nodeCount: 15, gpuNodeCount: 8 },
    });
    expect(result.nodeCount).toBe(15);
    expect(result.gpuNodeCount).toBe(8);
  });

  it("delete calls prisma.cluster.delete", async () => {
    mockPrisma.cluster.delete.mockResolvedValue(mockCluster);
    await clusterRepository.delete("cluster-1");
    expect(mockPrisma.cluster.delete).toHaveBeenCalledWith({
      where: { id: "cluster-1" },
    });
  });

  it("hasActiveWorkloads returns false (placeholder)", async () => {
    const result = await clusterRepository.hasActiveWorkloads("cluster-1");
    expect(result).toBe(false);
  });

  it("countByStatus returns counts", async () => {
    mockPrisma.cluster.groupBy.mockResolvedValue([
      { status: "HEALTHY", _count: 3 },
      { status: "DEGRADED", _count: 1 },
    ]);
    const result = await clusterRepository.countByStatus();
    expect(mockPrisma.cluster.groupBy).toHaveBeenCalledWith({
      by: ["status"],
      _count: true,
    });
    expect(result).toEqual({
      HEALTHY: 3,
      DEGRADED: 1,
      UNHEALTHY: 0,
      UNKNOWN: 0,
    });
  });
});

describe("UserRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = {
    id: "user-1",
    email: "user@test.com",
    username: "testuser",
    passwordHash: "$2a$10$hash",
    role: "user",
    createdAt: realDate,
    updatedAt: realDate,
  };

  it("findById returns user when found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    const result = await userRepository.findById("user-1");
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
    });
    expect(result).toEqual(mockUser);
  });

  it("findById returns null when not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await userRepository.findById("nonexistent");
    expect(result).toBeNull();
  });

  it("findByEmail returns user when found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    const result = await userRepository.findByEmail("user@test.com");
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@test.com" },
    });
    expect(result).toEqual(mockUser);
  });

  it("findByEmail returns null when not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await userRepository.findByEmail("unknown@test.com");
    expect(result).toBeNull();
  });

  it("findAll returns all users ordered by createdAt desc", async () => {
    const users = [
      { ...mockUser, id: "u1", createdAt: new Date("2026-01-02") },
      { ...mockUser, id: "u2", createdAt: new Date("2026-01-01") },
    ];
    mockPrisma.user.findMany.mockResolvedValue(users);
    const result = await userRepository.findAll();
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
    expect(result).toEqual(users);
  });

  it("create calls prisma.user.create with correct data", async () => {
    mockPrisma.user.create.mockResolvedValue(mockUser);
    const result = await userRepository.create({
      email: "user@test.com",
      username: "testuser",
      passwordHash: "$2a$10$hash",
      role: "user",
    });
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        email: "user@test.com",
        username: "testuser",
        passwordHash: "$2a$10$hash",
        role: "user",
      },
    });
    expect(result).toEqual(mockUser);
  });

  it("create defaults role to undefined", async () => {
    mockPrisma.user.create.mockResolvedValue(mockUser);
    await userRepository.create({
      email: "a@b.com",
      username: "u",
      passwordHash: "hash",
    });
    const data = mockPrisma.user.create.mock.calls[0][0].data;
    expect(data.role).toBeUndefined();
  });

  it("update calls prisma.user.update", async () => {
    mockPrisma.user.update.mockResolvedValue({
      ...mockUser,
      username: "newname",
    });
    const result = await userRepository.update("user-1", {
      username: "newname",
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { username: "newname" },
    });
    expect(result.username).toBe("newname");
  });

  it("updatePassword updates hash", async () => {
    mockPrisma.user.update.mockResolvedValue({
      ...mockUser,
      passwordHash: "$2a$10$newhash",
    });
    const result = await userRepository.updatePassword(
      "user-1",
      "$2a$10$newhash",
    );
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordHash: "$2a$10$newhash" },
    });
    expect(result.passwordHash).toBe("$2a$10$newhash");
  });

  it("updateRole updates role", async () => {
    mockPrisma.user.update.mockResolvedValue({ ...mockUser, role: "admin" });
    const result = await userRepository.updateRole("user-1", "admin");
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { role: "admin" },
    });
    expect(result.role).toBe("admin");
  });

  it("delete calls prisma.user.delete", async () => {
    mockPrisma.user.delete.mockResolvedValue(mockUser);
    await userRepository.delete("user-1");
    expect(mockPrisma.user.delete).toHaveBeenCalledWith({
      where: { id: "user-1" },
    });
  });
});
