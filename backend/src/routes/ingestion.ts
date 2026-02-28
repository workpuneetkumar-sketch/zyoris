import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { prisma } from "../lib/prisma";
import { simulateIngestionRun } from "../services/ingestionService";
import { validateWebhookSignature } from "../security/webhook";
import { detectColumns, analyzeRows, type UploadAnalysis } from "../services/fileAnalysisService";
import { generateDataSenseReport, type DataSenseReport } from "../services/dataSenseAnalysisService";

export const ingestionRouter = Router();

const upload = multer({ storage: multer.memoryStorage() });

export type LastUploadResult = UploadAnalysis & { dataSenseReport?: DataSenseReport };
let lastUploadAnalysis: LastUploadResult | null = null;

// Trigger full ingestion (e.g., scheduled or manual)
ingestionRouter.post("/run", async (_req, res) => {
  const result = await simulateIngestionRun();
  res.json(result);
});

// Example webhook endpoint for CRM events
ingestionRouter.post("/webhook/crm", async (req, res) => {
  const signature = req.headers["x-zyoris-signature"];
  if (typeof signature !== "string") {
    return res.status(400).json({ error: "Missing signature" });
  }
  const bodyString = JSON.stringify(req.body);
  if (!validateWebhookSignature(bodyString, signature)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = req.body as {
    externalId: string;
    name: string;
    stage: string;
    amount: number;
    currency: string;
    closeDate?: string;
    owner?: string;
  };

  await prisma.deal.upsert({
    where: { externalId: event.externalId },
    create: {
      externalId: event.externalId,
      sourceSystem: "CRM",
      name: event.name,
      stage: event.stage,
      amount: event.amount,
      currency: event.currency,
      closeDate: event.closeDate ? new Date(event.closeDate) : null,
      owner: event.owner,
    },
    update: {
      name: event.name,
      stage: event.stage,
      amount: event.amount,
      currency: event.currency,
      closeDate: event.closeDate ? new Date(event.closeDate) : null,
      owner: event.owner,
    },
  });

  res.json({ status: "ok" });
});

// CSV / Excel upload endpoint
ingestionRouter.post("/upload", upload.single("file"), async (req, res) => {
  const anyReq = req as any;
  if (!anyReq.file) {
    return res.status(400).json({ error: "Missing file" });
  }

  try {
    const workbook = XLSX.read(anyReq.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

    const detected = detectColumns(rows);
    const analysisResult = analyzeRows(rows, detected);
    const analysis: UploadAnalysis = { ...analysisResult, detectedColumns: detected };
    const dataSenseReport = generateDataSenseReport(rows, analysis);
    lastUploadAnalysis = { ...analysis, dataSenseReport };

    let revenueCount = 0;
    let dealCount = 0;
    let expenseCount = 0;
    let marketingCount = 0;

    for (const row of rows) {
      const lowerKeys = Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k.toString().toLowerCase(), v])
      );

      const type = (lowerKeys["type"] as string | null)?.toLowerCase() ?? null;

      const dateValue = lowerKeys["date"] ?? lowerKeys["transaction_date"];
      const amountValue = Number(lowerKeys["amount"] ?? lowerKeys["value"] ?? 0);
      const currency = (lowerKeys["currency"] as string) ?? "USD";

      if (type === "revenue" || (!type && dateValue && amountValue > 0)) {
        await prisma.revenue.create({
          data: {
            sourceSystem: (lowerKeys["source"] as string) ?? "UPLOAD",
            date: new Date(dateValue),
            amount: amountValue,
            currency,
            segment: (lowerKeys["segment"] as string) ?? null,
          },
        });
        revenueCount += 1;
        continue;
      }

      if (type === "expense") {
        await prisma.expense.create({
          data: {
            sourceSystem: (lowerKeys["source"] as string) ?? "UPLOAD",
            date: dateValue ? new Date(dateValue) : new Date(),
            amount: amountValue,
            currency,
            category: (lowerKeys["category"] as string) ?? null,
          },
        });
        expenseCount += 1;
        continue;
      }

      if (type === "marketing") {
        await prisma.marketingSpend.create({
          data: {
            sourceSystem: (lowerKeys["source"] as string) ?? "UPLOAD",
            date: dateValue ? new Date(dateValue) : new Date(),
            channel: (lowerKeys["channel"] as string) ?? "Unknown",
            campaign: (lowerKeys["campaign"] as string) ?? null,
            amount: amountValue,
            currency,
          },
        });
        marketingCount += 1;
        continue;
      }

      if (type === "deal" || lowerKeys["name"] || lowerKeys["stage"]) {
        await prisma.deal.create({
          data: {
            externalId: (lowerKeys["externalid"] as string) ?? null,
            sourceSystem: (lowerKeys["source"] as string) ?? "UPLOAD",
            name: (lowerKeys["name"] as string) ?? "Uploaded deal",
            stage: (lowerKeys["stage"] as string) ?? "Qualified",
            amount: amountValue || 0,
            currency,
            closeDate: dateValue ? new Date(dateValue) : null,
            owner: (lowerKeys["owner"] as string) ?? null,
          },
        });
        dealCount += 1;
      }
    }

    res.json({
      status: "ok",
      rowsIngested: rows.length,
      revenueCount,
      expenseCount,
      marketingCount,
      dealCount,
      analysis: lastUploadAnalysis,
    });
  } catch (err) {
    return res.status(400).json({ error: "Unable to parse file. Please upload CSV or Excel." });
  }
});

// Last upload analysis (for dashboard charts and summary)
ingestionRouter.get("/last-analysis", (_req, res) => {
  if (!lastUploadAnalysis) return res.status(404).json({ error: "No upload analysis yet" });
  res.json(lastUploadAnalysis);
});

// Simple log query endpoint
ingestionRouter.get("/summary", async (_req, res) => {
  const [dealCount, revenueCount, expenseCount, marketingCount, inventoryCount] =
    await Promise.all([
      prisma.deal.count(),
      prisma.revenue.count(),
      prisma.expense.count(),
      prisma.marketingSpend.count(),
      prisma.inventory.count(),
    ]);

  res.json({
    dealCount,
    revenueCount,
    expenseCount,
    marketingCount,
    inventoryCount,
  });
});

