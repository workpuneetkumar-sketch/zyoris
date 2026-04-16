import { Router } from "express";
import { prisma } from "../lib/prisma";
import {
  buildRevenueForecast,
  computeDemandTrends,
  computeConversionScores,
  computeRevenueDrivers,
} from "../services/analyticsService";
import { requireRole } from "../middleware/auth";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/ceo",
  requireRole(["CEO", "ADMIN"]),
  async (_req, res) => {
    const [revenue, deals, marketing, expenses, inventory] = await Promise.all([
      prisma.revenue.findMany({ orderBy: { date: "asc" } }),
      prisma.deal.findMany(),
      prisma.marketingSpend.findMany(),
      prisma.expense.findMany(),
      prisma.inventory.findMany(),
    ]);

    const forecast = buildRevenueForecast(revenue, 90);
    const demand = computeDemandTrends(inventory, revenue);
    const drivers = computeRevenueDrivers(revenue, marketing, expenses);

    res.json({
      revenueForecast: forecast,
      riskIndicators: {
        demandTrend: demand.demandTrend,
        marginPct: drivers.totals.marginPct,
      },
      kpis: {
        totalRevenue: drivers.totals.totalRevenue,
        margin: drivers.totals.margin,
        marketingRoi: drivers.totals.marketingRoi,
      },
    });
  }
);

dashboardRouter.get(
  "/cfo",
  requireRole(["CFO", "ADMIN"]),
  async (_req, res) => {
    const [revenue, marketing, expenses] = await Promise.all([
      prisma.revenue.findMany(),
      prisma.marketingSpend.findMany(),
      prisma.expense.findMany(),
    ]);
    const drivers = computeRevenueDrivers(revenue, marketing, expenses);

    res.json({
      marginTrends: {
        margin: drivers.totals.margin,
        marginPct: drivers.totals.marginPct,
      },
      expensesSummary: {
        totalExpenses: drivers.totals.totalExpenses,
      },
      marketingPerformance: drivers.channels,
      approvalWorkflows: {
        pendingApprovals: 0,
      },
    });
  }
);

dashboardRouter.get(
  "/sales",
  requireRole(["SALES_HEAD", "ADMIN"]),
  async (_req, res) => {
    const deals = await prisma.deal.findMany();
    const scores = computeConversionScores(deals);
    const avgScore =
      scores.length === 0
        ? 0
        : scores.reduce((s, d) => s + d.conversionProbability, 0) / scores.length;

    res.json({
      pipelineQualityScore: avgScore,
      conversionScores: scores,
    });
  }
);

dashboardRouter.get(
  "/operations",
  requireRole(["OPERATIONS_HEAD", "ADMIN"]),
  async (_req, res) => {
    const [inventory, revenue] = await Promise.all([
      prisma.inventory.findMany(),
      prisma.revenue.findMany(),
    ]);
    const demand = computeDemandTrends(inventory, revenue);

    res.json({
      demandForecast: demand.demandTrend,
      inventoryRiskAlerts: demand.inventoryRisk.filter((i) => i.risk !== "LOW"),
      optimizationSuggestions: [],
    });
  }
);

