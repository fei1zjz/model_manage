import { describe, it, expect, vi, beforeEach } from "vitest";

const validUUID = "550e8400-e29b-41d4-a716-446655440000";

const mockPublish = vi.hoisted(() => vi.fn());
const mockEventSubjects = vi.hoisted(() => ({
  SERVER_REGISTERED: "server.registered",
  SERVER_STATUS_CHANGED: "server.status.changed",
  ALLOCATION_CREATED: "allocation.created",
  ALLOCATION_RELEASED: "allocation.released",
}));

vi.mock("../mq", () => ({
  publish: mockPublish,
  EventSubjects: mockEventSubjects,
}));

const mockServerRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateStatus: vi.fn(),
  delete: vi.fn(),
  hasActiveAllocations: vi.fn(),
  countByStatus: vi.fn(),
}));

const mockAllocRepo = vi.hoisted(() => ({
  countActiveByUserId: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  updateStatus: vi.fn(),
  findMany: vi.fn(),
  findActiveByUserId: vi.fn(),
}));

const mockGpuRepo = vi.hoisted(() => ({
  createMany: vi.fn(),
  findAvailable: vi.fn(),
  updateStatus: vi.fn(),
  findById: vi.fn(),
  findByServerId: vi.fn(),
}));

const mockUserRepo = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  findAll: vi.fn(),
  update: vi.fn(),
  updatePassword: vi.fn(),
  updateRole: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("../repositories", () => ({
  serverRepository: mockServerRepo,
  allocationRepository: mockAllocRepo,
  gpuRepository: mockGpuRepo,
  userRepository: mockUserRepo,
}));

vi.mock("../repositories/user.repository", () => ({
  userRepository: mockUserRepo,
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2a$10$hashed"),
    compare: vi.fn(),
  },
  hash: vi.fn().mockResolvedValue("$2a$10$hashed"),
  compare: vi.fn(),
}));

describe("ServerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registerServer creates server and GPUs, publishes event", async () => {
    const mockServer = {
      id: validUUID,
      name: "s1",
      ip: "10.0.0.1",
      port: 8080,
      gpuCount: 4,
      gpuModel: "A100",
      totalMemory: BigInt("80000000000"),
      status: "ONLINE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockServerRepo.create.mockResolvedValue(mockServer);
    mockGpuRepo.createMany.mockResolvedValue([]);
    mockPublish.mockResolvedValue(undefined);

    const { serverService } = await import("../services/server.service");
    const result = await serverService.registerServer({
      name: "s1",
      ip: "10.0.0.1",
      port: 8080,
      gpuCount: 4,
      gpuModel: "A100",
      totalMemory: BigInt("80000000000"),
    });

    expect(result).toEqual(mockServer);
    expect(mockServerRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "s1", status: "ONLINE" }),
    );
    expect(mockGpuRepo.createMany).toHaveBeenCalledWith(
      mockServer.id,
      "A100",
      BigInt("20000000000"),
      4,
    );
    expect(mockPublish).toHaveBeenCalledWith(
      "server.registered",
      expect.objectContaining({ serverId: validUUID }),
    );
  });

  it("unregisterServer deletes if no active allocations", async () => {
    mockServerRepo.hasActiveAllocations.mockResolvedValue(false);
    mockServerRepo.delete.mockResolvedValue(undefined);

    const { serverService } = await import("../services/server.service");
    await serverService.unregisterServer(validUUID);
    expect(mockServerRepo.delete).toHaveBeenCalledWith(validUUID);
  });

  it("unregisterServer throws if active allocations exist", async () => {
    mockServerRepo.hasActiveAllocations.mockResolvedValue(true);

    const { serverService } = await import("../services/server.service");
    await expect(serverService.unregisterServer(validUUID)).rejects.toThrow(
      "Server has active allocations",
    );
    expect(mockServerRepo.delete).not.toHaveBeenCalled();
  });

  it("listServers delegates to repository", async () => {
    mockServerRepo.findMany.mockResolvedValue([]);
    const { serverService } = await import("../services/server.service");
    const result = await serverService.listServers({ status: "ONLINE" });
    expect(result).toEqual([]);
    expect(mockServerRepo.findMany).toHaveBeenCalledWith({ status: "ONLINE" });
  });

  it("getServer returns server when found", async () => {
    mockServerRepo.findById.mockResolvedValue({ id: validUUID, name: "s1" });
    const { serverService } = await import("../services/server.service");
    const result = await serverService.getServer(validUUID);
    expect(result).toEqual({ id: validUUID, name: "s1" });
  });

  it("getServer throws when not found", async () => {
    mockServerRepo.findById.mockResolvedValue(null);
    const { serverService } = await import("../services/server.service");
    await expect(serverService.getServer(validUUID)).rejects.toThrow(
      "Server not found",
    );
  });

  it("updateServerStatus updates and publishes event", async () => {
    const current = {
      id: validUUID,
      status: "ONLINE",
      name: "s1",
      ip: "10.0.0.1",
      port: 8080,
      gpuCount: 4,
      gpuModel: "A100",
      totalMemory: BigInt("80000000000"),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const updated = { ...current, status: "OFFLINE" };
    mockServerRepo.findById.mockResolvedValue(current);
    mockServerRepo.updateStatus.mockResolvedValue(updated);

    const { serverService } = await import("../services/server.service");
    const result = await serverService.updateServerStatus(validUUID, "OFFLINE");
    expect(result.status).toBe("OFFLINE");
    expect(mockPublish).toHaveBeenCalledWith("server.status.changed", {
      serverId: validUUID,
      previousStatus: "ONLINE",
      newStatus: "OFFLINE",
    });
  });
});

describe("AllocationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allocateGPU succeeds with available GPUs and quota", async () => {
    mockAllocRepo.countActiveByUserId.mockResolvedValue(0);
    mockGpuRepo.findAvailable.mockResolvedValue([
      {
        id: "gpu-1",
        serverId: "server-1",
        memory: BigInt("40000000000"),
        usedMemory: BigInt("1000000000"),
      },
    ]);
    mockAllocRepo.create.mockResolvedValue({
      id: "alloc-1",
      userId: validUUID,
      gpuId: "gpu-1",
      serverId: "server-1",
      status: "ACTIVE",
      requestedAt: new Date(),
      allocatedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    });
    mockGpuRepo.updateStatus.mockResolvedValue({});

    const { allocationService } =
      await import("../services/allocation.service");
    const result = await allocationService.allocateGPU(
      validUUID,
      "A100",
      BigInt("10000000000"),
      3600,
    );

    expect(result.status).toBe("ACTIVE");
    expect(mockAllocRepo.countActiveByUserId).toHaveBeenCalledWith(validUUID);
    expect(mockGpuRepo.findAvailable).toHaveBeenCalledWith(
      "A100",
      BigInt("10000000000"),
    );
    expect(mockGpuRepo.updateStatus).toHaveBeenCalledWith(
      "gpu-1",
      "BUSY",
      "alloc-1",
    );
    expect(mockPublish).toHaveBeenCalledWith(
      "allocation.created",
      expect.objectContaining({ allocationId: "alloc-1" }),
    );
  });

  it("allocateGPU throws when quota exceeded", async () => {
    mockAllocRepo.countActiveByUserId.mockResolvedValue(5);

    const { allocationService } =
      await import("../services/allocation.service");
    await expect(
      allocationService.allocateGPU(
        validUUID,
        "A100",
        BigInt("10000000000"),
        3600,
      ),
    ).rejects.toThrow("User quota exceeded");
  });

  it("allocateGPU throws when no GPUs available", async () => {
    mockAllocRepo.countActiveByUserId.mockResolvedValue(0);
    mockGpuRepo.findAvailable.mockResolvedValue([]);

    const { allocationService } =
      await import("../services/allocation.service");
    await expect(
      allocationService.allocateGPU(
        validUUID,
        "A100",
        BigInt("10000000000"),
        3600,
      ),
    ).rejects.toThrow("No available GPU resources");
  });

  it("allocateGPU picks GPU with most free memory", async () => {
    mockAllocRepo.countActiveByUserId.mockResolvedValue(0);
    mockGpuRepo.findAvailable.mockResolvedValue([
      {
        id: "gpu-low",
        serverId: "server-1",
        memory: BigInt("40000000000"),
        usedMemory: BigInt("30000000000"),
      },
      {
        id: "gpu-high",
        serverId: "server-1",
        memory: BigInt("40000000000"),
        usedMemory: BigInt("5000000000"),
      },
    ]);
    mockAllocRepo.create.mockResolvedValue({ id: "alloc-1", gpuId: "" });

    const { allocationService } =
      await import("../services/allocation.service");
    await allocationService.allocateGPU(
      validUUID,
      "A100",
      BigInt("10000000000"),
      3600,
    );
    expect(mockAllocRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ gpuId: "gpu-high" }),
    );
  });

  it("releaseGPU releases allocation and GPU", async () => {
    mockAllocRepo.findById.mockResolvedValue({
      id: "alloc-1",
      userId: validUUID,
      gpuId: "gpu-1",
      serverId: "server-1",
      status: "ACTIVE",
    });
    mockAllocRepo.updateStatus.mockResolvedValue({});
    mockGpuRepo.updateStatus.mockResolvedValue({});

    const { allocationService } =
      await import("../services/allocation.service");
    await allocationService.releaseGPU("alloc-1", validUUID);
    expect(mockAllocRepo.updateStatus).toHaveBeenCalledWith(
      "alloc-1",
      "RELEASED",
    );
    expect(mockGpuRepo.updateStatus).toHaveBeenCalledWith(
      "gpu-1",
      "IDLE",
      null,
    );
    expect(mockPublish).toHaveBeenCalledWith(
      "allocation.released",
      expect.objectContaining({ allocationId: "alloc-1" }),
    );
  });

  it("releaseGPU throws when allocation not found", async () => {
    mockAllocRepo.findById.mockResolvedValue(null);
    const { allocationService } =
      await import("../services/allocation.service");
    await expect(
      allocationService.releaseGPU("nonexistent", validUUID),
    ).rejects.toThrow("Allocation not found");
  });

  it("releaseGPU throws when userId does not match", async () => {
    mockAllocRepo.findById.mockResolvedValue({
      id: "alloc-1",
      userId: "other-user",
      status: "ACTIVE",
    });
    const { allocationService } =
      await import("../services/allocation.service");
    await expect(
      allocationService.releaseGPU("alloc-1", validUUID),
    ).rejects.toThrow("Unauthorized");
  });

  it("getUserAllocations returns filtered allocations", async () => {
    mockAllocRepo.findMany.mockResolvedValue([]);
    const { allocationService } =
      await import("../services/allocation.service");
    const result = await allocationService.getUserAllocations(validUUID, {
      status: "ACTIVE",
    });
    expect(result).toEqual([]);
    expect(mockAllocRepo.findMany).toHaveBeenCalledWith({
      status: "ACTIVE",
      userId: validUUID,
    });
  });
});

describe("UserService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("register creates user with hashed password", async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);
    mockUserRepo.create.mockResolvedValue({
      id: validUUID,
      email: "a@b.com",
      username: "testuser",
      role: "user",
    });

    const { default: bcrypt } = await import("bcryptjs");
    (bcrypt.hash as any).mockResolvedValue("$2a$10$hashed");

    const { userService } = await import("../services/user.service");
    const result = await userService.register({
      email: "a@b.com",
      username: "testuser",
      password: "secret123",
    });

    expect(result.email).toBe("a@b.com");
    expect(mockUserRepo.findByEmail).toHaveBeenCalledWith("a@b.com");
    expect(mockUserRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: "$2a$10$hashed" }),
    );
  });

  it("register throws when email exists", async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ id: "existing" });
    const { userService } = await import("../services/user.service");
    await expect(
      userService.register({ email: "a@b.com", username: "t", password: "pw" }),
    ).rejects.toThrow("Email already registered");
  });

  it("login returns user info on valid credentials", async () => {
    mockUserRepo.findByEmail.mockResolvedValue({
      id: validUUID,
      email: "a@b.com",
      username: "testuser",
      passwordHash: "$2a$10$hash",
      role: "user",
    });
    const { default: bcrypt } = await import("bcryptjs");
    (bcrypt.compare as any).mockResolvedValue(true);

    const { userService } = await import("../services/user.service");
    const result = await userService.login({
      email: "a@b.com",
      password: "correct",
    });
    expect(result.userId).toBe(validUUID);
    expect(result.role).toBe("user");
  });

  it("login throws on wrong password", async () => {
    mockUserRepo.findByEmail.mockResolvedValue({
      id: validUUID,
      email: "a@b.com",
      passwordHash: "$2a$10$hash",
    });
    const { default: bcrypt } = await import("bcryptjs");
    (bcrypt.compare as any).mockResolvedValue(false);

    const { userService } = await import("../services/user.service");
    await expect(
      userService.login({ email: "a@b.com", password: "wrong" }),
    ).rejects.toThrow("Invalid email or password");
  });

  it("login throws on unknown email", async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);
    const { userService } = await import("../services/user.service");
    await expect(
      userService.login({ email: "unknown@b.com", password: "pw" }),
    ).rejects.toThrow("Invalid email or password");
  });

  it("getProfile returns user when found", async () => {
    mockUserRepo.findById.mockResolvedValue({
      id: validUUID,
      email: "a@b.com",
    });
    const { userService } = await import("../services/user.service");
    const result = await userService.getProfile(validUUID);
    expect(result.email).toBe("a@b.com");
  });

  it("getProfile throws when not found", async () => {
    mockUserRepo.findById.mockResolvedValue(null);
    const { userService } = await import("../services/user.service");
    await expect(userService.getProfile(validUUID)).rejects.toThrow(
      "User not found",
    );
  });

  it("updateProfile updates user", async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);
    mockUserRepo.update.mockResolvedValue({
      id: validUUID,
      email: "new@b.com",
      username: "newname",
    });

    const { userService } = await import("../services/user.service");
    const result = await userService.updateProfile(validUUID, {
      email: "new@b.com",
      username: "newname",
    });
    expect(result.email).toBe("new@b.com");
  });

  it("updateProfile throws when email taken by another user", async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ id: "other-id" });
    const { userService } = await import("../services/user.service");
    await expect(
      userService.updateProfile(validUUID, { email: "other@b.com" }),
    ).rejects.toThrow("Email already in use");
  });

  it("changePassword updates password when old password is correct", async () => {
    mockUserRepo.findById.mockResolvedValue({
      id: validUUID,
      passwordHash: "$2a$10$oldhash",
    });
    const { default: bcrypt } = await import("bcryptjs");
    (bcrypt.compare as any).mockResolvedValue(true);
    (bcrypt.hash as any).mockResolvedValue("$2a$10$newhash");

    const { userService } = await import("../services/user.service");
    await userService.changePassword(validUUID, "oldpass", "newpass");
    expect(mockUserRepo.updatePassword).toHaveBeenCalledWith(
      validUUID,
      "$2a$10$newhash",
    );
  });

  it("changePassword throws when old password is wrong", async () => {
    mockUserRepo.findById.mockResolvedValue({
      id: validUUID,
      passwordHash: "$2a$10$oldhash",
    });
    const { default: bcrypt } = await import("bcryptjs");
    (bcrypt.compare as any).mockResolvedValue(false);

    const { userService } = await import("../services/user.service");
    await expect(
      userService.changePassword(validUUID, "wrong", "newpass"),
    ).rejects.toThrow("Current password is incorrect");
  });

  it("listUsers delegates to repository", async () => {
    mockUserRepo.findAll.mockResolvedValue([]);
    const { userService } = await import("../services/user.service");
    const result = await userService.listUsers();
    expect(result).toEqual([]);
  });

  it("updateRole updates user role", async () => {
    mockUserRepo.findById.mockResolvedValue({ id: validUUID, role: "user" });
    mockUserRepo.updateRole.mockResolvedValue({
      id: validUUID,
      role: "admin",
    });
    const { userService } = await import("../services/user.service");
    const result = await userService.updateRole(validUUID, "admin");
    expect(result.role).toBe("admin");
  });

  it("updateRole throws when user not found", async () => {
    mockUserRepo.findById.mockResolvedValue(null);
    const { userService } = await import("../services/user.service");
    await expect(userService.updateRole(validUUID, "admin")).rejects.toThrow(
      "User not found",
    );
  });

  it("deleteUser deletes user", async () => {
    mockUserRepo.findById.mockResolvedValue({ id: validUUID });
    mockUserRepo.delete.mockResolvedValue({ id: validUUID });
    const { userService } = await import("../services/user.service");
    await userService.deleteUser(validUUID);
    expect(mockUserRepo.delete).toHaveBeenCalledWith(validUUID);
  });

  it("deleteUser throws when not found", async () => {
    mockUserRepo.findById.mockResolvedValue(null);
    const { userService } = await import("../services/user.service");
    await expect(userService.deleteUser(validUUID)).rejects.toThrow(
      "User not found",
    );
  });
});
