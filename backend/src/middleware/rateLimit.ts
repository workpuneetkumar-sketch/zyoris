import { NextFunction, Request, Response } from "express";

// For the public demo we disable all rate limiting to avoid
// "Too many requests" errors for users behind shared IPs (e.g. offices, cafes, VPNs).
// If you want protection later, reintroduce express-rate-limit with a higher threshold.

function passThrough(_req: Request, _res: Response, next: NextFunction) {
  next();
}

export const apiRateLimiter = passThrough;
export const authRateLimiter = passThrough;


