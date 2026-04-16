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

analyticsRouter.get("/revenue/forecast", async (_req, res) => {
  const revenue = await prisma.revenue.findMany({
    orderBy: { date: "asc" },
  });
  const forecast = buildRevenueForecast(revenue, 90);
  res.json(forecast);
});

analyticsRouter.get("/demand/trends", async (_req, res) => {
  const inventory = await prisma.inventory.findMany();
  const revenue = await prisma.revenue.findMany();
  const trends = computeDemandTrends(inventory, revenue);
  res.json(trends);
});

analyticsRouter.get("/segments", async (_req, res) => {
  const revenue = await prisma.revenue.findMany();
  const segments = clusterSegments(revenue);
  res.json(segments);
});

analyticsRouter.get("/conversion/scores", async (_req, res) => {
  const deals = await prisma.deal.findMany();
  const scores = computeConversionScores(deals);
  res.json(scores);
});

analyticsRouter.get("/revenue/drivers", async (_req, res) => {
  const [revenue, marketing, expenses] = await Promise.all([
    prisma.revenue.findMany(),
    prisma.marketingSpend.findMany(),
    prisma.expense.findMany(),
  ]);
  const drivers = computeRevenueDrivers(revenue, marketing, expenses);
  res.json(drivers);
});

