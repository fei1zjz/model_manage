import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../auth/jwt";

export function auditLog(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const mutating = ["POST", "PUT", "PATCH", "DELETE"];
  if (mutating.includes(req.method)) {
    console.log(
      JSON.stringify({
        type: "audit",
        method: req.method,
        path: req.path,
        userId: req.user?.userId || "anonymous",
        timestamp: new Date().toISOString(),
      }),
    );
  }
  next();
}
