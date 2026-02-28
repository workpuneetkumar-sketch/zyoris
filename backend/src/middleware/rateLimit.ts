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

export const authRateLimiter =
  config.env === "production"
    ? rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 50,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: "Too many login attempts, please try again later." },
      })
    : passThrough;


