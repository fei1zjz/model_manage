import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.JWT_SECRET = "test-secret-key";
process.env.JWT_EXPIRES_IN = "1h";

import jwt from "jsonwebtoken";
import { generateToken, verifyToken } from "../auth/jwt";

const mockRedis = vi.hoisted(() => ({
  exists: vi.fn(),
  set: vi.fn(),
}));

vi.mock("../cache/client", () => ({
  redis: mockRedis,
}));

describe("Auth - JWT token", () => {
  const payload = {
    userId: "550e8400-e29b-41d4-a716-446655440000",
    email: "test@example.com",
    role: "user" as const,
  };

  it("generates and verifies a valid token", () => {
    const token = generateToken(payload);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");

    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeDefined();
  });

  it("throws for invalid token string", () => {
    expect(() => verifyToken("invalid-token")).toThrow();
  });

  it("throws for tampered token", () => {
    const token = generateToken(payload);
    const parts = token.split(".");
    const tampered = parts[0] + "." + parts[1] + ".invalidsignature";
    expect(() => verifyToken(tampered)).toThrow();
  });

  it("throws for expired token", () => {
    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: "0s",
    });
    expect(() => verifyToken(token)).toThrow();
  });

  it("accepts admin role token", () => {
    const adminPayload = { ...payload, role: "admin" as const };
    const token = generateToken(adminPayload);
    const decoded = verifyToken(token);
    expect(decoded.role).toBe("admin");
  });

  it("accepts viewer role token", () => {
    const viewerPayload = { ...payload, role: "viewer" as const };
    const token = generateToken(viewerPayload);
    const decoded = verifyToken(token);
    expect(decoded.role).toBe("viewer");
  });
});

describe("Auth - token blacklist", () => {
  beforeEach(() => {
    mockRedis.exists.mockReset();
    mockRedis.set.mockReset();
  });

  it("isTokenBlacklisted returns false when not blacklisted", async () => {
    mockRedis.exists.mockResolvedValue(0);
    const { isTokenBlacklisted } = await import("../auth/jwt");
    const result = await isTokenBlacklisted("some-token");
    expect(result).toBe(false);
    expect(mockRedis.exists).toHaveBeenCalledWith("token:blacklist:some-token");
  });

  it("isTokenBlacklisted returns true when blacklisted", async () => {
    mockRedis.exists.mockResolvedValue(1);
    const { isTokenBlacklisted } = await import("../auth/jwt");
    const result = await isTokenBlacklisted("blacklisted-token");
    expect(result).toBe(true);
  });

  it("blacklistToken stores with correct key and expiry", async () => {
    mockRedis.set.mockResolvedValue("OK");
    const { blacklistToken } = await import("../auth/jwt");
    await blacklistToken("test-token", 3600);
    expect(mockRedis.set).toHaveBeenCalledWith(
      "token:blacklist:test-token",
      "1",
      "EX",
      3600,
    );
  });

  it("isTokenBlacklisted throws on redis error (no fail-open)", async () => {
    mockRedis.exists.mockRejectedValue(new Error("Redis connection error"));
    const { isTokenBlacklisted } = await import("../auth/jwt");
    await expect(isTokenBlacklisted("error-token")).rejects.toThrow();
  });
});

describe("Auth - authenticate middleware", () => {
  beforeEach(() => {
    mockRedis.exists.mockReset();
  });

  it("returns 401 when no authorization header", async () => {
    const { authenticate } = await import("../auth/jwt");
    const req = { headers: {} } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Missing or invalid authorization header",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid", async () => {
    const { authenticate } = await import("../auth/jwt");
    const req = { headers: { authorization: "Bearer invalid-token" } } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() with valid token and not blacklisted", async () => {
    const token = generateToken({
      userId: "550e8400-e29b-41d4-a716-446655440000",
      email: "test@example.com",
      role: "user",
    });

    mockRedis.exists.mockResolvedValue(0);

    const { authenticate } = await import("../auth/jwt");
    const req = { headers: { authorization: `Bearer ${token}` } } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user!.userId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });
});

describe("Auth - requireRole middleware", () => {
  it("allows access when user has required role", async () => {
    const { requireRole } = await import("../auth/jwt");
    const middleware = requireRole("admin");
    const req = {
      user: { userId: "u1", email: "a@b.com", role: "admin" },
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("denies access when user lacks required role", async () => {
    const { requireRole } = await import("../auth/jwt");
    const middleware = requireRole("admin");
    const req = {
      user: { userId: "u1", email: "a@b.com", role: "user" },
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when no user on request", async () => {
    const { requireRole } = await import("../auth/jwt");
    const middleware = requireRole("admin");
    const req = {} as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts multiple roles", async () => {
    const { requireRole } = await import("../auth/jwt");
    const middleware = requireRole("admin", "user");

    const req = {
      user: { userId: "u1", email: "a@b.com", role: "user" },
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
