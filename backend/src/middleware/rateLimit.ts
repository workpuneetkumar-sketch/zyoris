import { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../shared/config";

function passThrough(_req: Request, _res: Response, next: NextFunction) {
  next();
}

export const apiRateLimiter =
  config.env === "production"
    ? rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 500,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: "Too many requests, please try again later." },
      })
    : passThrough;

// Auth rate limiting is disabled to avoid blocking demo users behind shared IPs.
// If you want to enable it later, reintroduce a limiter similar to apiRateLimiter.
export const authRateLimiter = passThrough;


