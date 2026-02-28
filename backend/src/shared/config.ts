export type AppEnv = "development" | "production" | "test";

const NODE_ENV = (process.env.NODE_ENV as AppEnv | undefined) ?? "development";

function parseFrontendUrls(): string[] {
  const fromList = process.env.FRONTEND_URLS;
  const fromSingle = process.env.FRONTEND_URL;
  const raw =
    (fromList && fromList.trim().length > 0 ? fromList : undefined) ??
    (fromSingle && fromSingle.trim().length > 0 ? fromSingle : undefined) ??
    (NODE_ENV === "production" ? "" : "http://localhost:3000");
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const FRONTEND_URLS = parseFrontendUrls();
const FRONTEND_URL = FRONTEND_URLS[0] ?? "";

export const config = {
  env: NODE_ENV,
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret",
  webhookSecret: process.env.WEBHOOK_SECRET ?? "dev-webhook-secret",
  frontendUrl: FRONTEND_URL,
  frontendUrls: FRONTEND_URLS,
};

