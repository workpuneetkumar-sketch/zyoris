import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cron from "node-cron";

import { authRouter } from "./routes/auth";
import { ingestionRouter } from "./routes/ingestion";
import { analyticsRouter } from "./routes/analytics";
import { recommendationRouter } from "./routes/recommendations";
import { dashboardRouter } from "./routes/dashboard";
import { rolesRouter } from "./routes/roles";
import { requireAuth } from "./middleware/auth";
import { auditMiddleware } from "./middleware/audit";
import { errorHandler } from "./middleware/errorHandler";
import { apiRateLimiter } from "./middleware/rateLimit";
import { config } from "./shared/config";
import { httpLogger, logger } from "./shared/logger";
import { prisma } from "./lib/prisma";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser clients (no Origin header)
      if (!origin) return cb(null, true);
      // If no allow-list configured, allow all origins (MVP-friendly).
      const allowList = config.frontendUrls ?? [];
      if (allowList.length === 0) return cb(null, true);
      if (allowList.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: false,
  })
);
app.use(express.json());
app.use(httpLogger);
app.use(auditMiddleware);
app.use(apiRateLimiter);

app.get("/health", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      service: "zyoris-backend",
      db: "reachable",
      env: config.env,
    });
  } catch (err) {
    return next(Object.assign(new Error("Database unreachable"), { statusCode: 503 }));
  }
});

app.use("/auth", authRouter);
app.use("/ingestion", requireAuth, ingestionRouter);
app.use("/analytics", requireAuth, analyticsRouter);
app.use("/recommendations", requireAuth, recommendationRouter);
app.use("/dashboard", requireAuth, dashboardRouter);
app.use("/roles", rolesRouter);

app.use(errorHandler);

const port = config.port;

app.listen(port, () => {
  logger.info({ port, env: config.env }, "Zyoris backend listening");
});

// Scheduled ingestion job - runs every hour
cron.schedule("0 * * * *", () => {
  import("./services/ingestionService")
    .then(({ simulateIngestionRun }) => simulateIngestionRun())
    .then((result) => logger.info({ result }, "Ingestion job completed"))
    .catch((err) => logger.error({ err }, "Ingestion job failed"));
});


