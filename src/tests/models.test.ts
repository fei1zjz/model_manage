import { describe, it, expect } from "vitest";
import {
  ServerSchema,
  ServerCreateInputSchema,
  GPUSchema,
  GPUCreateInputSchema,
  AllocationSchema,
  AllocationCreateInputSchema,
  AlertSchema,
  AlertCreateInputSchema,
  ClusterSchema,
  ClusterCreateInputSchema,
  RouteConfigSchema,
  RouteConfigCreateInputSchema,
  UserSchema,
  ServerFilterSchema,
  AllocationFilterSchema,
  AlertFilterSchema,
  RouteFilterSchema,
  ClusterFilterSchema,
  UpstreamTargetSchema,
  HealthCheckConfigSchema,
  RateLimitPolicySchema,
  RetryPolicySchema,
  validateServer,
  validateServerCreateInput,
  validateGPU,
  validateGPUCreateInput,
  validateAllocation,
  validateAllocationCreateInput,
  validateAlert,
  validateAlertCreateInput,
  validateCluster,
  validateClusterCreateInput,
  validateRouteConfig,
  validateRouteConfigCreateInput,
  safeValidateServer,
  safeValidateGPU,
  safeValidateCluster,
  safeValidateRegister,
  safeValidateLogin,
  safeValidateUpdateProfile,
  safeValidateChangePassword,
  safeValidateUpdateUserRole,
  ServerStatusEnum,
  GPUStatusEnum,
  AllocationStatusEnum,
  AlertSeverityEnum,
  AlertStatusEnum,
  HttpMethodEnum,
  LoadBalanceStrategyEnum,
  ClusterStatusEnum,
  UserRoleEnum,
} from "../models";

const validUUID = "550e8400-e29b-41d4-a716-446655440000";

describe("Model Schema validations", () => {
  describe("ServerSchema", () => {
    const validServer = {
      id: validUUID,
      name: "server-1",
      ip: "192.168.1.1",
      port: 8080,
      gpuCount: 4,
      gpuModel: "A100",
      totalMemory: BigInt("80000000000"),
      status: "ONLINE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("accepts valid server", () => {
      expect(ServerSchema.parse(validServer)).toBeTruthy();
    });

    it("rejects invalid IP", () => {
      expect(() =>
        ServerSchema.parse({ ...validServer, ip: "not-an-ip" }),
      ).toThrow();
    });

    it("rejects negative gpuCount", () => {
      expect(() =>
        ServerSchema.parse({ ...validServer, gpuCount: -1 }),
      ).toThrow();
    });

    it("rejects invalid status", () => {
      expect(() =>
        ServerSchema.parse({ ...validServer, status: "UNKNOWN" }),
      ).toThrow();
    });

    it("rejects invalid port range", () => {
      expect(() =>
        ServerSchema.parse({ ...validServer, port: 99999 }),
      ).toThrow();
    });
  });

  describe("ServerSchema totalMemory transform", () => {
    const base = {
      id: validUUID,
      name: "server-1",
      ip: "192.168.1.1",
      port: 8080,
      gpuCount: 4,
      gpuModel: "A100",
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "ONLINE",
    };

    it("accepts bigint", () => {
      const result = ServerSchema.parse({
        ...base,
        totalMemory: BigInt("80000000000"),
      });
      expect(result.totalMemory).toBe(BigInt("80000000000"));
    });

    it("accepts string and transforms to bigint", () => {
      const result = ServerSchema.parse({
        ...base,
        totalMemory: "80000000000",
      });
      expect(result.totalMemory).toBe(BigInt("80000000000"));
    });

    it("accepts number and transforms to bigint", () => {
      const result = ServerSchema.parse({ ...base, totalMemory: 80000000000 });
      expect(result.totalMemory).toBe(BigInt("80000000000"));
    });

    it("transforms negative number to bigint", () => {
      const result = ServerSchema.parse({ ...base, totalMemory: -100 });
      expect(result.totalMemory).toBe(BigInt("-100"));
    });
  });

  describe("GPUSchema memory/usedMemory transform", () => {
    const base = {
      id: validUUID,
      serverId: validUUID,
      index: 0,
      model: "A100",
      status: "IDLE",
      allocatedTo: null,
    };

    it("accepts bigint for memory", () => {
      const result = GPUSchema.parse({
        ...base,
        memory: BigInt("40000000000"),
        usedMemory: BigInt("0"),
      });
      expect(result.memory).toBe(BigInt("40000000000"));
    });

    it("accepts string for memory", () => {
      const result = GPUSchema.parse({
        ...base,
        memory: "40000000000",
        usedMemory: "0",
      });
      expect(result.memory).toBe(BigInt("40000000000"));
    });

    it("accepts number for memory", () => {
      const result = GPUSchema.parse({
        ...base,
        memory: 40000000000,
        usedMemory: 0,
      });
      expect(result.memory).toBe(BigInt("40000000000"));
    });

    it("rejects missing required fields", () => {
      expect(() => GPUSchema.parse({})).toThrow();
    });
  });

  describe("AllocationSchema", () => {
    const validAllocation = {
      id: validUUID,
      userId: validUUID,
      gpuId: validUUID,
      serverId: validUUID,
      requestedAt: new Date(),
      allocatedAt: null,
      expiresAt: null,
      status: "PENDING",
      metadata: null,
    };

    it("accepts valid allocation", () => {
      expect(AllocationSchema.parse(validAllocation)).toBeTruthy();
    });

    it("accepts metadata as object", () => {
      const result = AllocationSchema.parse({
        ...validAllocation,
        metadata: { key: "value", count: 123 },
      });
      expect(result.metadata).toEqual({ key: "value", count: 123 });
    });

    it("rejects invalid status", () => {
      expect(() =>
        AllocationSchema.parse({ ...validAllocation, status: "INVALID" }),
      ).toThrow();
    });
  });

  describe("ClusterSchema", () => {
    const validCluster = {
      id: validUUID,
      name: "cluster-1",
      apiServer: "https://k8s.example.com",
      kubeconfig: "apiVersion: v1\nkind: Config",
      version: "1.25",
      nodeCount: 10,
      gpuNodeCount: 2,
      status: "HEALTHY",
      labels: { region: "us-east" },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("accepts valid cluster", () => {
      expect(ClusterSchema.parse(validCluster)).toBeTruthy();
    });

    it("accepts nullable version", () => {
      const result = ClusterSchema.parse({ ...validCluster, version: null });
      expect(result.version).toBeNull();
    });

    it("accepts nullable labels", () => {
      const result = ClusterSchema.parse({ ...validCluster, labels: null });
      expect(result.labels).toBeNull();
    });
  });

  describe("ClusterCreateInputSchema version", () => {
    const base = {
      name: "cluster-1",
      apiServer: "https://k8s.example.com",
      kubeconfig: "config-content",
      labels: null,
    };

    it("accepts string version", () => {
      const result = ClusterCreateInputSchema.parse({
        ...base,
        version: "1.26",
      });
      expect(result.version).toBe("1.26");
    });

    it("accepts null version", () => {
      const result = ClusterCreateInputSchema.parse({ ...base, version: null });
      expect(result.version).toBeNull();
    });

    it("accepts missing version", () => {
      const result = ClusterCreateInputSchema.parse(base);
      expect(result.version).toBeUndefined();
    });
  });

  describe("AlertSchema", () => {
    const validAlert = {
      id: validUUID,
      ruleId: validUUID,
      severity: "CRITICAL",
      source: "monitor",
      message: "GPU temperature high",
      triggeredAt: new Date(),
      acknowledgedAt: null,
      acknowledgedBy: null,
      status: "FIRING",
    };

    it("accepts valid alert", () => {
      expect(AlertSchema.parse(validAlert)).toBeTruthy();
    });

    it("defaults status to FIRING", () => {
      const { status, ...rest } = validAlert;
      const result = AlertSchema.parse(rest);
      expect(result.status).toBe("FIRING");
    });
  });

  describe("RouteConfigSchema", () => {
    const validRoute = {
      id: validUUID,
      name: "test-route",
      path: "/api/test",
      method: "GET",
      upstream: {
        targets: [{ host: "localhost", port: 4000 }],
        loadBalance: "ROUND_ROBIN",
      },
      rateLimit: null,
      authRequired: false,
      timeout: 30000,
      retryPolicy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    it("accepts valid route config", () => {
      expect(RouteConfigSchema.parse(validRoute)).toBeTruthy();
    });

    it("rejects path not starting with /", () => {
      expect(() =>
        RouteConfigSchema.parse({ ...validRoute, path: "api/test" }),
      ).toThrow();
    });

    it("rejects empty targets", () => {
      expect(() =>
        RouteConfigSchema.parse({
          ...validRoute,
          upstream: { targets: [], loadBalance: "ROUND_ROBIN" },
        }),
      ).toThrow();
    });
  });

  describe("UserSchema", () => {
    const validUser = {
      id: validUUID,
      email: "user@example.com",
      username: "testuser",
      passwordHash: "$2a$10$hashedpassword",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("accepts valid user", () => {
      expect(UserSchema.parse(validUser)).toBeTruthy();
    });

    it("rejects invalid email", () => {
      expect(() =>
        UserSchema.parse({ ...validUser, email: "not-email" }),
      ).toThrow();
    });

    it("rejects invalid role", () => {
      expect(() =>
        UserSchema.parse({ ...validUser, role: "superadmin" }),
      ).toThrow();
    });
  });

  describe("Enum schemas", () => {
    it("ServerStatusEnum parses valid values", () => {
      expect(ServerStatusEnum.parse("ONLINE")).toBe("ONLINE");
      expect(ServerStatusEnum.parse("OFFLINE")).toBe("OFFLINE");
      expect(() => ServerStatusEnum.parse("UNKNOWN")).toThrow();
    });

    it("GPUStatusEnum parses valid values", () => {
      expect(GPUStatusEnum.parse("IDLE")).toBe("IDLE");
      expect(GPUStatusEnum.parse("BUSY")).toBe("BUSY");
    });

    it("AllocationStatusEnum parses valid values", () => {
      expect(AllocationStatusEnum.parse("ACTIVE")).toBe("ACTIVE");
      expect(AllocationStatusEnum.parse("RELEASED")).toBe("RELEASED");
    });

    it("AlertSeverityEnum parses valid values", () => {
      expect(AlertSeverityEnum.parse("CRITICAL")).toBe("CRITICAL");
      expect(() => AlertSeverityEnum.parse("LOW")).toThrow();
    });

    it("ClusterStatusEnum parses valid values", () => {
      expect(ClusterStatusEnum.parse("HEALTHY")).toBe("HEALTHY");
    });

    it("UserRoleEnum parses valid values", () => {
      expect(UserRoleEnum.parse("admin")).toBe("admin");
      expect(UserRoleEnum.parse("user")).toBe("user");
      expect(UserRoleEnum.parse("viewer")).toBe("viewer");
    });

    it("HttpMethodEnum parses valid values", () => {
      expect(HttpMethodEnum.parse("GET")).toBe("GET");
      expect(HttpMethodEnum.parse("ANY")).toBe("ANY");
    });

    it("LoadBalanceStrategyEnum parses valid values", () => {
      expect(LoadBalanceStrategyEnum.parse("ROUND_ROBIN")).toBe("ROUND_ROBIN");
    });
  });
});

describe("Filter schemas", () => {
  it("ServerFilterSchema accepts partial filters", () => {
    expect(ServerFilterSchema.parse({ status: "ONLINE" })).toEqual({
      status: "ONLINE",
    });
    expect(ServerFilterSchema.parse({})).toEqual({});
  });

  it("AllocationFilterSchema accepts partial filters", () => {
    expect(AllocationFilterSchema.parse({ userId: validUUID })).toEqual({
      userId: validUUID,
    });
    expect(AllocationFilterSchema.parse({})).toEqual({});
  });

  it("AlertFilterSchema accepts partial filters", () => {
    expect(AlertFilterSchema.parse({ severity: "ERROR" })).toEqual({
      severity: "ERROR",
    });
    expect(AlertFilterSchema.parse({})).toEqual({});
  });

  it("RouteFilterSchema accepts partial filters", () => {
    expect(RouteFilterSchema.parse({ method: "GET" })).toEqual({
      method: "GET",
    });
    expect(RouteFilterSchema.parse({})).toEqual({});
  });

  it("ClusterFilterSchema accepts partial filters", () => {
    expect(ClusterFilterSchema.parse({ status: "HEALTHY" })).toEqual({
      status: "HEALTHY",
    });
    expect(ClusterFilterSchema.parse({})).toEqual({});
  });
});

describe("Validation helpers", () => {
  it("validateServer throws on invalid data", () => {
    expect(() => validateServer({})).toThrow();
  });

  it("validateGPU throws on invalid data", () => {
    expect(() => validateGPU({})).toThrow();
  });

  it("validateAllocation throws on invalid data", () => {
    expect(() => validateAllocation({})).toThrow();
  });

  it("validateCluster throws on invalid data", () => {
    expect(() => validateCluster({})).toThrow();
  });

  it("validateAlert throws on invalid data", () => {
    expect(() => validateAlert({})).toThrow();
  });

  it("validateRouteConfig throws on invalid data", () => {
    expect(() => validateRouteConfig({})).toThrow();
  });

  it("validateServerCreateInput throws on invalid data", () => {
    expect(() => validateServerCreateInput({})).toThrow();
  });

  it("validateGPUCreateInput throws on invalid data", () => {
    expect(() => validateGPUCreateInput({})).toThrow();
  });

  it("validateAllocationCreateInput throws on invalid data", () => {
    expect(() => validateAllocationCreateInput({})).toThrow();
  });

  it("validateClusterCreateInput throws on invalid data", () => {
    expect(() => validateClusterCreateInput({})).toThrow();
  });

  it("validateAlertCreateInput throws on invalid data", () => {
    expect(() => validateAlertCreateInput({})).toThrow();
  });
});

describe("Safe validation helpers", () => {
  it("safeValidateServer returns success for valid data", () => {
    const result = safeValidateServer({
      id: validUUID,
      name: "s1",
      ip: "10.0.0.1",
      port: 8080,
      gpuCount: 1,
      gpuModel: "T4",
      totalMemory: BigInt("16000000000"),
      status: "ONLINE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(result.success).toBe(true);
  });

  it("safeValidateServer returns error for invalid data", () => {
    const result = safeValidateServer({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it("safeValidateGPU returns success for valid data", () => {
    const result = safeValidateGPU({
      id: validUUID,
      serverId: validUUID,
      index: 0,
      model: "T4",
      memory: BigInt("16000000000"),
      usedMemory: BigInt("0"),
      status: "IDLE",
      allocatedTo: null,
    });
    expect(result.success).toBe(true);
  });

  it("safeValidateCluster returns success for valid data", () => {
    const result = safeValidateCluster({
      id: validUUID,
      name: "c1",
      apiServer: "https://example.com",
      kubeconfig: "cfg",
      version: null,
      nodeCount: 0,
      gpuNodeCount: 0,
      status: "UNKNOWN",
      labels: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(result.success).toBe(true);
  });

  it("safeValidateRegister validates registration input", () => {
    const valid = safeValidateRegister({
      email: "a@b.com",
      username: "u",
      password: "123456",
    });
    expect(valid.success).toBe(true);

    const invalid = safeValidateRegister({
      email: "bad",
      username: "",
      password: "12",
    });
    expect(invalid.success).toBe(false);
  });

  it("safeValidateLogin validates login input", () => {
    const valid = safeValidateLogin({ email: "a@b.com", password: "pw" });
    expect(valid.success).toBe(true);

    const invalid = safeValidateLogin({ email: "", password: "" });
    expect(invalid.success).toBe(false);
  });

  it("safeValidateUpdateProfile validates profile updates", () => {
    const valid = safeValidateUpdateProfile({
      email: "a@b.com",
      username: "u",
    });
    expect(valid.success).toBe(true);

    const empty = safeValidateUpdateProfile({});
    expect(empty.success).toBe(true);
  });

  it("safeValidateChangePassword validates password changes", () => {
    const valid = safeValidateChangePassword({
      oldPassword: "old",
      newPassword: "newpass",
    });
    expect(valid.success).toBe(true);

    const invalid = safeValidateChangePassword({
      oldPassword: "",
      newPassword: "",
    });
    expect(invalid.success).toBe(false);
  });

  it("safeValidateUpdateUserRole validates role updates", () => {
    const valid = safeValidateUpdateUserRole({ role: "admin" });
    expect(valid.success).toBe(true);

    const invalid = safeValidateUpdateUserRole({ role: "god" });
    expect(invalid.success).toBe(false);
  });
});

describe("Sub-schemas", () => {
  it("UpstreamTargetSchema validates targets", () => {
    expect(() =>
      UpstreamTargetSchema.parse({ host: "localhost", port: 80 }),
    ).not.toThrow();
    expect(() =>
      UpstreamTargetSchema.parse({ host: "localhost", port: -1 }),
    ).toThrow();
  });

  it("HealthCheckConfigSchema applies defaults", () => {
    const result = HealthCheckConfigSchema.parse({});
    expect(result.enabled).toBe(true);
    expect(result.interval).toBe(30);
    expect(result.timeout).toBe(5);
    expect(result.healthyThreshold).toBe(2);
    expect(result.unhealthyThreshold).toBe(3);
  });

  it("RateLimitPolicySchema validates rate limits", () => {
    expect(() =>
      RateLimitPolicySchema.parse({ requestsPerSecond: 10, burst: 20 }),
    ).not.toThrow();
    expect(() =>
      RateLimitPolicySchema.parse({ requestsPerSecond: -1, burst: 20 }),
    ).toThrow();
  });

  it("RetryPolicySchema applies defaults", () => {
    const result = RetryPolicySchema.parse({});
    expect(result.retries).toBe(3);
    expect(result.backoff).toBe("exponential");
  });
});

describe("GPUCreateInputSchema", () => {
  it("accepts usedMemory as string", () => {
    const result = GPUCreateInputSchema.parse({
      serverId: validUUID,
      index: 0,
      model: "A100",
      memory: "40000000000",
      usedMemory: "1000000000",
    });
    expect(result.memory).toBe(BigInt("40000000000"));
    expect(result.usedMemory).toBe(BigInt("1000000000"));
  });

  it("allows optional fields to be omitted", () => {
    const result = GPUCreateInputSchema.parse({
      serverId: validUUID,
      index: 0,
      model: "A100",
      memory: BigInt("40000000000"),
    });
    expect(result.usedMemory).toBeUndefined();
    expect(result.status).toBeUndefined();
  });
});

describe("ServerCreateInputSchema", () => {
  it("allows status override", () => {
    const result = ServerCreateInputSchema.parse({
      name: "s1",
      ip: "10.0.0.1",
      port: 8080,
      gpuCount: 1,
      gpuModel: "T4",
      totalMemory: BigInt("16000000000"),
      status: "MAINTENANCE",
    });
    expect(result.status).toBe("MAINTENANCE");
  });

  it("omits id, createdAt, updatedAt", () => {
    const result = ServerCreateInputSchema.parse({
      name: "s1",
      ip: "10.0.0.1",
      port: 8080,
      gpuCount: 1,
      gpuModel: "T4",
      totalMemory: BigInt("16000000000"),
    });
    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("updatedAt");
  });
});
