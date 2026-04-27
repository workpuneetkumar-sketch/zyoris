import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import jwt from "jsonwebtoken";

export interface AuthPayload {
  userId: string;
  role: string;
  organizationId: string | null;
  tokenType: "access" | "refresh";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";

export function signAccessToken(payload: Omit<AuthPayload, "tokenType">): string {
  return jwt.sign({ ...payload, tokenType: "access" }, JWT_SECRET, { expiresIn: "2h" });
}

export function signRefreshToken(payload: Omit<AuthPayload, "tokenType">) {
  const token = jwt.sign({ ...payload, tokenType: "refresh" }, JWT_REFRESH_SECRET, {
    expiresIn: "30d",
  });

  return {
    token,
    hash: hashToken(token),
  };
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

export function verifyAccessToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

export function verifyRefreshToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as AuthPayload;
}

export function verifyToken(token: string): AuthPayload {
  return verifyAccessToken(token);
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  const token = authHeader.substring("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    if (payload.tokenType !== "access") {
      return res.status(401).json({ error: "Invalid token type" });
    }
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireOrganization(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!req.user.organizationId) {
    return res.status(403).json({ error: "Organization context required" });
  }
  return next();
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}

