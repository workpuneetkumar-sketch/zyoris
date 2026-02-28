import pino from "pino";
import pinoHttp from "pino-http";
import { config } from "./config";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (config.env === "production" ? "info" : "debug"),
  transport:
    config.env === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        }
      : undefined,
});

export const httpLogger = pinoHttp({
  logger,
  customLogLevel: (res, err) => {
    const status = res.statusCode ?? 200;
    if (status >= 500 || err) return "error";
    if (status >= 400) return "warn";
    return "info";
  },
});

