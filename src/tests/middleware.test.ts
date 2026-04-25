import { describe, it, expect, vi } from "vitest";
import { auditLog } from "../middleware/audit";

describe("auditLog middleware", () => {
  it("logs mutating methods (POST)", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const req = {
      method: "POST",
      path: "/api/servers",
      user: { userId: "user-1", email: "a@b.com", role: "admin" },
    } as any;
    const res = {} as any;
    const next = vi.fn();

    auditLog(req, res, next);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logArg = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logArg.type).toBe("audit");
    expect(logArg.method).toBe("POST");
    expect(logArg.path).toBe("/api/servers");
    expect(logArg.userId).toBe("user-1");
    expect(next).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("logs mutating methods (PUT)", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const req = {
      method: "PUT",
      path: "/api/servers/1",
      user: { userId: "user-1" },
    } as any;
    const res = {} as any;
    const next = vi.fn();

    auditLog(req, res, next);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it("logs mutating methods (PATCH)", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const req = {
      method: "PATCH",
      path: "/api/users/1",
      user: { userId: "user-1" },
    } as any;
    const res = {} as any;
    const next = vi.fn();

    auditLog(req, res, next);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it("logs mutating methods (DELETE)", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const req = {
      method: "DELETE",
      path: "/api/allocations/1",
      user: { userId: "user-1" },
    } as any;
    const res = {} as any;
    const next = vi.fn();

    auditLog(req, res, next);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it("does not log GET requests", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const req = {
      method: "GET",
      path: "/api/servers",
      user: { userId: "user-1" },
    } as any;
    const res = {} as any;
    const next = vi.fn();

    auditLog(req, res, next);
    expect(consoleSpy).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("uses 'anonymous' when no user", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const req = {
      method: "POST",
      path: "/api/login",
      headers: {},
    } as any;
    const res = {} as any;
    const next = vi.fn();

    auditLog(req, res, next);
    const logArg = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logArg.userId).toBe("anonymous");
    consoleSpy.mockRestore();
  });
});
