import { prisma } from "../lib/prisma";
import { normalizeCurrency, standardizeDate } from "../services/transformationService";

// Simulated external data sources
const mockCrmDeals = [
  {
    externalId: "CRM-001",
    name: "Enterprise Subscription - ACME",
    stage: "Closed Won",
    amount: 120000,
    currency: "USD",
    closeDate: "2025-12-31",
    owner: "Sales Rep A",
  },
];

const mockRevenueEvents = [
  {
    externalId: "REV-001",
    sourceSystem: "ERP",
    date: "2025-12-01",
    amount: 45000,
    currency: "USD",
    segment: "Enterprise SaaS",
  },
];

const mockExpenses = [
  {
    externalId: "EXP-001",
    sourceSystem: "ACCOUNTING",
    date: "2025-12-01",
    amount: 15000,
    currency: "USD",
    category: "Payroll",
  },
];

const mockMarketingSpend = [
  {
    externalId: "MKT-001",
    sourceSystem: "MARKETING",
    date: "2025-12-01",
    channel: "Paid Search",
    campaign: "Q4 Growth",
    amount: 5000,
    currency: "USD",
  },
];

const mockInventory = [
  {
    externalId: "INV-001",
    sourceSystem: "INVENTORY",
    sku: "SKU-001",
    name: "Premium Hardware Kit",
    quantity: 500,
    safetyStock: 200,
    unitCost: 100,
    currency: "USD",
  },
];

export async function simulateIngestionRun() {
  let dealsCreated = 0;
  let revenueCreated = 0;
  let expensesCreated = 0;
  let marketingCreated = 0;
  let inventoryCreated = 0;

  for (const d of mockCrmDeals) {
    const normalizedAmount = normalizeCurrency(d.amount, d.currency, "USD");
    const closeDate = d.closeDate ? standardizeDate(d.closeDate) : null;

    await prisma.deal.upsert({
      where: { externalId: d.externalId },
      create: {
        externalId: d.externalId,
        sourceSystem: "CRM",
        name: d.name,
        stage: d.stage,
        amount: normalizedAmount,
        currency: "USD",
        closeDate,
        owner: d.owner,
      },
      update: {
        name: d.name,
        stage: d.stage,
        amount: normalizedAmount,
        currency: "USD",
        closeDate,
        owner: d.owner,
      },
    });
    dealsCreated += 1;
  }

  for (const r of mockRevenueEvents) {
    const normalizedAmount = normalizeCurrency(r.amount, r.currency, "USD");
    const date = standardizeDate(r.date);
    await prisma.revenue.upsert({
      where: { externalId: r.externalId },
      create: {
        externalId: r.externalId,
        sourceSystem: r.sourceSystem,
        date,
        amount: normalizedAmount,
        currency: "USD",
        segment: r.segment,
      },
      update: {
        date,
        amount: normalizedAmount,
        currency: "USD",
        segment: r.segment,
      },
    });
    revenueCreated += 1;
  }

  for (const e of mockExpenses) {
    const normalizedAmount = normalizeCurrency(e.amount, e.currency, "USD");
    const date = standardizeDate(e.date);
    await prisma.expense.upsert({
      where: { externalId: e.externalId },
      create: {
        externalId: e.externalId,
        sourceSystem: e.sourceSystem,
        date,
        amount: normalizedAmount,
        currency: "USD",
        category: e.category,
      },
      update: {
        date,
        amount: normalizedAmount,
        currency: "USD",
        category: e.category,
      },
    });
    expensesCreated += 1;
  }

  for (const m of mockMarketingSpend) {
    const normalizedAmount = normalizeCurrency(m.amount, m.currency, "USD");
    const date = standardizeDate(m.date);
    await prisma.marketingSpend.upsert({
      where: { externalId: m.externalId },
      create: {
        externalId: m.externalId,
        sourceSystem: m.sourceSystem,
        date,
        channel: m.channel,
        campaign: m.campaign,
        amount: normalizedAmount,
        currency: "USD",
      },
      update: {
        date,
        channel: m.channel,
        campaign: m.campaign,
        amount: normalizedAmount,
        currency: "USD",
      },
    });
    marketingCreated += 1;
  }

  for (const i of mockInventory) {
    const unitCost = normalizeCurrency(i.unitCost, i.currency, "USD");
    await prisma.inventory.upsert({
      where: { externalId: i.externalId },
      create: {
        externalId: i.externalId,
        sourceSystem: i.sourceSystem,
        sku: i.sku,
        name: i.name,
        quantity: i.quantity,
        safetyStock: i.safetyStock,
        unitCost,
        currency: "USD",
      },
      update: {
        quantity: i.quantity,
        safetyStock: i.safetyStock,
        unitCost,
        currency: "USD",
      },
    });
    inventoryCreated += 1;
  }

  return {
    dealsCreated,
    revenueCreated,
    expensesCreated,
    marketingCreated,
    inventoryCreated,
  };
}

