import crypto from "crypto";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "dev-webhook-secret";

export function signWebhookPayload(payload: string): string {
  return crypto.createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");
}

export function validateWebhookSignature(payload: string, signature: string): boolean {
  const expected = signWebhookPayload(payload);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

