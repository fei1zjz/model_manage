import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedis = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  scan: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
  exists: vi.fn(),
  incr: vi.fn(),
  incrby: vi.fn(),
  decr: vi.fn(),
  mget: vi.fn(),
  pipeline: vi.fn(),
  info: vi.fn(),
  dbsize: vi.fn(),
}));

vi.mock("../cache/client", () => ({
  redis: mockRedis,
}));

describe("buildKey", () => {
  it("builds key with namespace and parts", async () => {
    const { buildKey } = await import("../cache/helpers");
    expect(buildKey("server:status", "abc", 123)).toBe("server:status:abc:123");
  });

  it("handles single part", async () => {
    const { buildKey } = await import("../cache/helpers");
    expect(buildKey("gpu:status", "gpu-1")).toBe("gpu:status:gpu-1");
  });
});

describe("cacheGet", () => {
  beforeEach(() => {
    mockRedis.get.mockReset();
  });

  it("returns value when found", async () => {
    mockRedis.get.mockResolvedValue('{"key":"val"}');
    const { cacheGet } = await import("../cache/helpers");
    const result = await cacheGet<{ key: string }>("mykey");
    expect(result.found).toBe(true);
    expect(result.value?.key).toBe("val");
  });

  it("returns not found when key missing", async () => {
    mockRedis.get.mockResolvedValue(null);
    const { cacheGet } = await import("../cache/helpers");
    const result = await cacheGet("missing");
    expect(result.found).toBe(false);
    expect(result.value).toBeNull();
  });

  it("returns not found on redis error", async () => {
    mockRedis.get.mockRejectedValue(new Error("timeout"));
    const { cacheGet } = await import("../cache/helpers");
    const result = await cacheGet("error");
    expect(result.found).toBe(false);
    expect(result.value).toBeNull();
  });
});

describe("cacheSet", () => {
  beforeEach(() => {
    mockRedis.set.mockReset();
  });

  it("sets without options", async () => {
    mockRedis.set.mockResolvedValue("OK");
    const { cacheSet } = await import("../cache/helpers");
    const result = await cacheSet("k", "v");
    expect(result).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledWith("k", '"v"');
  });

  it("sets with TTL", async () => {
    mockRedis.set.mockResolvedValue("OK");
    const { cacheSet } = await import("../cache/helpers");
    const result = await cacheSet("k", "v", { ttl: 60 });
    expect(result).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledWith("k", '"v"', "EX", 60);
  });

  it("sets with NX", async () => {
    mockRedis.set.mockResolvedValue("OK");
    const { cacheSet } = await import("../cache/helpers");
    const result = await cacheSet("k", "v", { nx: true });
    expect(result).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledWith("k", '"v"', "NX");
  });

  it("sets with TTL+NX", async () => {
    mockRedis.set.mockResolvedValue("OK");
    const { cacheSet } = await import("../cache/helpers");
    const result = await cacheSet("k", "v", { ttl: 60, nx: true });
    expect(result).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledWith("k", '"v"', "EX", 60, "NX");
  });

  it("sets with TTL+XX", async () => {
    mockRedis.set.mockResolvedValue("OK");
    const { cacheSet } = await import("../cache/helpers");
    const result = await cacheSet("k", "v", { ttl: 60, xx: true });
    expect(result).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledWith("k", '"v"', "EX", 60, "XX");
  });

  it("returns false on failure", async () => {
    mockRedis.set.mockRejectedValue(new Error("fail"));
    const { cacheSet } = await import("../cache/helpers");
    const result = await cacheSet("k", "v");
    expect(result).toBe(false);
  });
});

describe("cacheDelete", () => {
  beforeEach(() => {
    mockRedis.del.mockReset();
  });

  it("deletes key", async () => {
    mockRedis.del.mockResolvedValue(1);
    const { cacheDelete } = await import("../cache/helpers");
    const result = await cacheDelete("mykey");
    expect(result).toBe(true);
    expect(mockRedis.del).toHaveBeenCalledWith("mykey");
  });

  it("returns false when key missing", async () => {
    mockRedis.del.mockResolvedValue(0);
    const { cacheDelete } = await import("../cache/helpers");
    const result = await cacheDelete("missing");
    expect(result).toBe(false);
  });

  it("returns false on error", async () => {
    mockRedis.del.mockRejectedValue(new Error("fail"));
    const { cacheDelete } = await import("../cache/helpers");
    const result = await cacheDelete("error");
    expect(result).toBe(false);
  });
});

describe("cacheDeletePattern", () => {
  beforeEach(() => {
    mockRedis.scan.mockReset();
    mockRedis.del.mockReset();
  });

  it("deletes keys matching pattern", async () => {
    mockRedis.scan
      .mockResolvedValueOnce(["0", ["k1", "k2"]])
      .mockResolvedValueOnce(["0", []]);
    mockRedis.del.mockResolvedValue(2);

    const { cacheDeletePattern } = await import("../cache/helpers");
    const result = await cacheDeletePattern("prefix:*");
    expect(result).toBe(2);
    expect(mockRedis.scan).toHaveBeenCalledWith(
      "0",
      "MATCH",
      "prefix:*",
      "COUNT",
      100,
    );
    expect(mockRedis.del).toHaveBeenCalledWith("k1", "k2");
  });

  it("handles multi-cursor scan", async () => {
    mockRedis.scan
      .mockResolvedValueOnce(["1", ["k1"]])
      .mockResolvedValueOnce(["0", ["k2"]]);
    mockRedis.del.mockResolvedValue(2);

    const { cacheDeletePattern } = await import("../cache/helpers");
    const result = await cacheDeletePattern("*");
    expect(result).toBe(2);
    expect(mockRedis.del).toHaveBeenCalledWith("k1", "k2");
  });

  it("returns 0 when no keys match", async () => {
    mockRedis.scan.mockResolvedValue(["0", []]);

    const { cacheDeletePattern } = await import("../cache/helpers");
    const result = await cacheDeletePattern("nomatch:*");
    expect(result).toBe(0);
  });

  it("returns 0 on error", async () => {
    mockRedis.scan.mockRejectedValue(new Error("fail"));

    const { cacheDeletePattern } = await import("../cache/helpers");
    const result = await cacheDeletePattern("*");
    expect(result).toBe(0);
  });
});

describe("cacheExpire / cacheTTL / cacheExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("expire sets TTL", async () => {
    mockRedis.expire.mockResolvedValue(1);
    const { cacheExpire } = await import("../cache/helpers");
    expect(await cacheExpire("k", 60)).toBe(true);
    expect(mockRedis.expire).toHaveBeenCalledWith("k", 60);
  });

  it("expire returns false on error", async () => {
    mockRedis.expire.mockRejectedValue(new Error("fail"));
    const { cacheExpire } = await import("../cache/helpers");
    expect(await cacheExpire("k", 60)).toBe(false);
  });

  it("ttl returns remaining time", async () => {
    mockRedis.ttl.mockResolvedValue(30);
    const { cacheTTL } = await import("../cache/helpers");
    expect(await cacheTTL("k")).toBe(30);
  });

  it("ttl returns -1 on error", async () => {
    mockRedis.ttl.mockRejectedValue(new Error("fail"));
    const { cacheTTL } = await import("../cache/helpers");
    expect(await cacheTTL("k")).toBe(-1);
  });

  it("exists returns true when key exists", async () => {
    mockRedis.exists.mockResolvedValue(1);
    const { cacheExists } = await import("../cache/helpers");
    expect(await cacheExists("k")).toBe(true);
  });

  it("exists returns false on error", async () => {
    mockRedis.exists.mockRejectedValue(new Error("fail"));
    const { cacheExists } = await import("../cache/helpers");
    expect(await cacheExists("k")).toBe(false);
  });
});

describe("cacheIncr / cacheIncrBy / cacheDecr", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("incr increments counter", async () => {
    mockRedis.incr.mockResolvedValue(5);
    const { cacheIncr } = await import("../cache/helpers");
    expect(await cacheIncr("counter")).toBe(5);
  });

  it("incr returns -1 on error", async () => {
    mockRedis.incr.mockRejectedValue(new Error("fail"));
    const { cacheIncr } = await import("../cache/helpers");
    expect(await cacheIncr("counter")).toBe(-1);
  });

  it("incrBy increments by amount", async () => {
    mockRedis.incrby.mockResolvedValue(10);
    const { cacheIncrBy } = await import("../cache/helpers");
    expect(await cacheIncrBy("counter", 5)).toBe(10);
    expect(mockRedis.incrby).toHaveBeenCalledWith("counter", 5);
  });

  it("decr decrements counter", async () => {
    mockRedis.decr.mockResolvedValue(4);
    const { cacheDecr } = await import("../cache/helpers");
    expect(await cacheDecr("counter")).toBe(4);
  });
});

describe("cacheSetCounter / cacheGetCounter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("set counter without TTL", async () => {
    mockRedis.set.mockResolvedValue("OK");
    const { cacheSetCounter } = await import("../cache/helpers");
    expect(await cacheSetCounter("c", 42)).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledWith("c", 42);
  });

  it("set counter with TTL", async () => {
    mockRedis.set.mockResolvedValue("OK");
    const { cacheSetCounter } = await import("../cache/helpers");
    expect(await cacheSetCounter("c", 42, 60)).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledWith("c", 42, "EX", 60);
  });

  it("get counter returns number", async () => {
    mockRedis.get.mockResolvedValue("42");
    const { cacheGetCounter } = await import("../cache/helpers");
    expect(await cacheGetCounter("c")).toBe(42);
  });

  it("get counter returns null when missing", async () => {
    mockRedis.get.mockResolvedValue(null);
    const { cacheGetCounter } = await import("../cache/helpers");
    expect(await cacheGetCounter("c")).toBeNull();
  });

  it("get counter returns null on error", async () => {
    mockRedis.get.mockRejectedValue(new Error("fail"));
    const { cacheGetCounter } = await import("../cache/helpers");
    expect(await cacheGetCounter("c")).toBeNull();
  });
});

describe("cacheMGet", () => {
  beforeEach(() => {
    mockRedis.mget.mockReset();
  });

  it("returns map of values", async () => {
    mockRedis.mget.mockResolvedValue(['"v1"', null, '"v3"']);
    const { cacheMGet } = await import("../cache/helpers");
    const result = await cacheMGet(["k1", "k2", "k3"]);
    expect(result.get("k1")).toBe("v1");
    expect(result.get("k2")).toBeNull();
    expect(result.get("k3")).toBe("v3");
  });

  it("handles empty keys", async () => {
    const { cacheMGet } = await import("../cache/helpers");
    const result = await cacheMGet([]);
    expect(result.size).toBe(0);
  });

  it("returns empty map on error", async () => {
    mockRedis.mget.mockRejectedValue(new Error("fail"));
    const { cacheMGet } = await import("../cache/helpers");
    const result = await cacheMGet(["k1"]);
    expect(result.size).toBe(0);
  });
});

describe("cacheMSet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets multiple values", async () => {
    const mockPipeline = { set: vi.fn(), exec: vi.fn().mockResolvedValue([]) };
    mockRedis.pipeline.mockReturnValue(mockPipeline);

    const { cacheMSet } = await import("../cache/helpers");
    const result = await cacheMSet([
      { key: "k1", value: "v1" },
      { key: "k2", value: "v2", ttl: 60 },
    ]);
    expect(result).toBe(true);
    expect(mockPipeline.set).toHaveBeenCalledTimes(2);
    expect(mockPipeline.set).toHaveBeenCalledWith("k1", '"v1"');
    expect(mockPipeline.set).toHaveBeenCalledWith("k2", '"v2"', "EX", 60);
    expect(mockPipeline.exec).toHaveBeenCalled();
  });

  it("handles empty entries", async () => {
    const { cacheMSet } = await import("../cache/helpers");
    const result = await cacheMSet([]);
    expect(result).toBe(true);
  });

  it("returns false on error", async () => {
    mockRedis.pipeline.mockImplementation(() => {
      throw new Error("fail");
    });
    const { cacheMSet } = await import("../cache/helpers");
    const result = await cacheMSet([{ key: "k", value: "v" }]);
    expect(result).toBe(false);
  });
});

describe("getCacheStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed stats", async () => {
    mockRedis.info
      .mockResolvedValueOnce("used_memory:1048576\n")
      .mockResolvedValueOnce("connected_clients:5\n")
      .mockResolvedValueOnce("keyspace_hits:100\nkeyspace_misses:10\n");
    mockRedis.dbsize.mockResolvedValue(50);

    const { getCacheStats } = await import("../cache/helpers");
    const stats = await getCacheStats();
    expect(stats.usedMemory).toBe(1048576);
    expect(stats.connectedClients).toBe(5);
    expect(stats.hits).toBe(100);
    expect(stats.misses).toBe(10);
    expect(stats.totalKeys).toBe(50);
  });

  it("returns zeros on error", async () => {
    mockRedis.info.mockRejectedValue(new Error("fail"));
    const { getCacheStats } = await import("../cache/helpers");
    const stats = await getCacheStats();
    expect(stats.usedMemory).toBe(0);
    expect(stats.connectedClients).toBe(0);
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
    expect(stats.totalKeys).toBe(0);
  });
});

describe("CacheNamespaces / CacheTTL exports", () => {
  it("exports CacheNamespaces and CacheTTL", async () => {
    const { CacheNamespaces, CacheTTL } = await import("../cache/helpers");
    expect(CacheNamespaces.SERVER_STATUS).toBe("server:status");
    expect(CacheTTL.SERVER_STATUS).toBe(30);
  });
});
