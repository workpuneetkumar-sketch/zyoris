import { Router } from "express";
import { prisma } from "../lib/prisma";
import { generateRecommendations } from "../services/recommendationService";

export const recommendationRouter = Router();

recommendationRouter.get("/", async (_req, res) => {
  const [revenue, deals, marketing, expenses, inventory] = await Promise.all([
    prisma.revenue.findMany(),
    prisma.deal.findMany(),
    prisma.marketingSpend.findMany(),
    prisma.expense.findMany(),
    prisma.inventory.findMany(),
  ]);

  const recommendations = generateRecommendations({
    revenue,
    deals,
    marketing,
    expenses,
    inventory,
  });

  res.json(recommendations);
});

