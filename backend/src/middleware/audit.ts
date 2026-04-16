import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export async function auditMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = Date.now();
  const userId = req.user?.userId;

  res.on("finish", async () => {
    try {
      const durationMs = Date.now() - start;
      await prisma.auditLog.create({
        data: {
          userId: userId ?? null,
          action: `${req.method} ${req.path}`,
          metadata: {
            statusCode: res.statusCode,
            durationMs,
          },
        },
      });
    } catch {
      // best-effort; do not block request
    }
  });

  next();
}

