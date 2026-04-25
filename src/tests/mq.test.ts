import { describe, it, expect, vi, beforeEach } from "vitest";

const mockConnect = vi.hoisted(() => vi.fn());
const mockNc = vi.hoisted(() => ({
  publish: vi.fn(),
  subscribe: vi.fn(),
  drain: vi.fn(),
  closed: vi.fn(),
}));
const mockStringCodec = vi.hoisted(() => ({
  encode: vi.fn((s) => new TextEncoder().encode(s)),
  decode: vi.fn((b) => new TextDecoder().decode(b)),
}));

vi.mock("nats", () => ({
  connect: mockConnect,
  StringCodec: vi.fn(() => mockStringCodec),
}));

describe("MQ Client", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue(mockNc);

    // Reset the module-level connection
    const { disconnectNats } = await import("../mq/client");
    await disconnectNats();
  });

  it("getNatsConnection connects and caches", async () => {
    process.env.NATS_URL = "nats://test:4222";
    const { getNatsConnection } = await import("../mq/client");
    const nc1 = await getNatsConnection();
    const nc2 = await getNatsConnection();
    expect(nc1).toBe(nc2);
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledWith({
      servers: "nats://test:4222",
    });
  });

  it("publish publishes to subject", async () => {
    const { publish } = await import("../mq/client");
    await publish("test.subject", { key: "value" });
    expect(mockNc.publish).toHaveBeenCalledWith(
      "test.subject",
      expect.any(Uint8Array),
    );
  });

  it("publish does not throw on error", async () => {
    mockConnect.mockRejectedValue(new Error("connection failed"));
    const { publish } = await import("../mq/client");
    await expect(
      publish("test.subject", { key: "value" }),
    ).resolves.not.toThrow();
  });

  it("disconnectNats drains connection", async () => {
    mockConnect.mockResolvedValue(mockNc);
    const { getNatsConnection, disconnectNats } = await import("../mq/client");
    await getNatsConnection();
    await disconnectNats();
    expect(mockNc.drain).toHaveBeenCalled();
  });
});
