import { Request, Response, NextFunction } from "express";
import { verifyToken, TokenPayload } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized", message: "No token provided" });
    return;
  }
  const token = auth.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired token" });
  }
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== "superadmin") {
      res.status(403).json({ error: "forbidden", message: "Super admin access required" });
      return;
    }
    next();
  });
}
