import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../shared/logger";

interface AppError extends Error {
  statusCode?: number;
  details?: unknown;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;

  if (err instanceof ZodError) {
    const payload = {
      error: "ValidationError",
      issues: err.issues,
    };
    logger.warn({ err, issues: err.issues }, "Request validation failed");
    return res.status(400).json(payload);
  }

  logger.error({ err }, "Unhandled error");

  return res.status(status).json({
    error: status === 500 ? "InternalServerError" : err.message,
  });
}

