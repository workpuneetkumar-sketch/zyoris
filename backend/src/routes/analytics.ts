import { Router } from "express";
import { prisma } from "../lib/prisma";
import {
  buildRevenueForecast,
  computeDemandTrends,
  computeConversionScores,
  computeRevenueDrivers,
  clusterSegments,
} from "../services/analyticsService";

export const analyticsRouter = Router();

analyticsRouter.get("/revenue/forecast", async (req, res) => {
  const organizationId = req.user!.organizationId!;
  const revenue = await prisma.revenue.findMany({
    where: { organizationId },
    orderBy: { date: "asc" },
  });
  const forecast = buildRevenueForecast(revenue, 90);
  res.json(forecast);
});

analyticsRouter.get("/demand/trends", async (req, res) => {
  const organizationId = req.user!.organizationId!;
  const inventory = await prisma.inventory.findMany({ where: { organizationId } });
  const revenue = await prisma.revenue.findMany({ where: { organizationId } });
  const trends = computeDemandTrends(inventory, revenue);
  res.json(trends);
});

analyticsRouter.get("/segments", async (req, res) => {
  const organizationId = req.user!.organizationId!;
  const revenue = await prisma.revenue.findMany({ where: { organizationId } });
  const segments = clusterSegments(revenue);
  res.json(segments);
});

analyticsRouter.get("/conversion/scores", async (req, res) => {
  const organizationId = req.user!.organizationId!;
  const deals = await prisma.deal.findMany({ where: { organizationId } });
  const scores = computeConversionScores(deals);
  res.json(scores);
});

analyticsRouter.get("/revenue/drivers", async (req, res) => {
  const organizationId = req.user!.organizationId!;
  const [revenue, marketing, expenses] = await Promise.all([
    prisma.revenue.findMany({ where: { organizationId } }),
    prisma.marketingSpend.findMany({ where: { organizationId } }),
    prisma.expense.findMany({ where: { organizationId } }),
  ]);
  const drivers = computeRevenueDrivers(revenue, marketing, expenses);
  res.json(drivers);
});

