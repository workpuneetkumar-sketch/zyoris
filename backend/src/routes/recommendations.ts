import { Router } from "express";
import { prisma } from "../lib/prisma";
import { generateRecommendations } from "../services/recommendationService";

export const recommendationRouter = Router();

recommendationRouter.get("/", async (req, res) => {
  const organizationId = req.user!.organizationId!;
  const [revenue, deals, marketing, expenses, inventory] = await Promise.all([
    prisma.revenue.findMany({ where: { organizationId } }),
    prisma.deal.findMany({ where: { organizationId } }),
    prisma.marketingSpend.findMany({ where: { organizationId } }),
    prisma.expense.findMany({ where: { organizationId } }),
    prisma.inventory.findMany({ where: { organizationId } }),
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

