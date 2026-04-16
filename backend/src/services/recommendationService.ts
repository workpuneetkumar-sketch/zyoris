import { Deal, Expense, Inventory, MarketingSpend, Revenue } from "@prisma/client";

type RecommendationInput = {
  revenue: Revenue[];
  deals: Deal[];
  marketing: MarketingSpend[];
  expenses: Expense[];
  inventory: Inventory[];
};

export function generateRecommendations(input: RecommendationInput) {
  const recommendations: {
    type: string;
    title: string;
    description: string;
    confidence: number;
    financialImpact: number;
    justification: string;
  }[] = [];

  const last30DaysRevenue = sumLastNDays(input.revenue, 30);
  const prev30DaysRevenue = sumPrevWindow(input.revenue, 30, 30);
  const revenueDelta = last30DaysRevenue - prev30DaysRevenue;
  const revenueDeltaPct =
    prev30DaysRevenue === 0 ? 0 : revenueDelta / prev30DaysRevenue;

  const pipelineQuality = computePipelineQuality(input.deals);

  const totalMarketing = input.marketing.reduce((s, m) => s + m.amount, 0);
  const totalRevenue = input.revenue.reduce((s, r) => s + r.amount, 0);
  const marketingRoi =
    totalMarketing === 0 ? null : (totalRevenue - totalMarketing) / totalMarketing;

  const totalExpenses = input.expenses.reduce((s, e) => s + e.amount, 0);
  const margin = totalRevenue - totalExpenses;

  const understockedInventory = input.inventory.filter(
    (i) => i.quantity < i.safetyStock
  );

  if (revenueDeltaPct < -0.15 && pipelineQuality.lowQualityRatio > 0.4) {
    const impact = Math.abs(revenueDelta);
    recommendations.push({
      type: "HIRING_FREEZE",
      title: "Consider temporary hiring freeze in GTM functions",
      description:
        "Revenue has declined sharply while a large share of the pipeline is low quality. Freezing new GTM hires can protect margins until pipeline quality improves.",
      confidence: 0.8,
      financialImpact: impact,
      justification: `Revenue declined ${Math.round(
        revenueDeltaPct * 100
      )}% over the last 30 days and ${Math.round(
        pipelineQuality.lowQualityRatio * 100
      )}% of open pipeline is low probability.`,
    });
  }

  if (marketingRoi !== null && marketingRoi < 1) {
    const impact = totalMarketing * (1 - marketingRoi);
    recommendations.push({
      type: "REALLOCATE_MARKETING",
      title: "Reallocate marketing spend towards higher ROI channels",
      description:
        "Current aggregate marketing ROI is below 1. Shift budget from underperforming channels to those with stronger performance or higher intent.",
      confidence: 0.75,
      financialImpact: impact,
      justification: `Aggregate marketing ROI is ${marketingRoi.toFixed(
        2
      )}, indicating suboptimal spend efficiency.`,
    });
  }

  if (understockedInventory.length > 0 && revenueDeltaPct > 0) {
    const impact =
      understockedInventory.reduce(
        (s, i) => s + (i.safetyStock - i.quantity) * i.unitCost,
        0
      ) * 2;
    recommendations.push({
      type: "REDUCE_PRODUCTION",
      title: "Rebalance production mix and mitigate stockout risk",
      description:
        "Demand is growing while several SKUs are below safety stock. Adjust production and procurement to prioritize high-velocity items and reduce overproduction elsewhere.",
      confidence: 0.7,
      financialImpact: impact,
      justification: `${understockedInventory.length} SKUs are below safety stock while revenue is trending up ${Math.round(
        revenueDeltaPct * 100
      )}%.`,
    });
  } else if (revenueDeltaPct < -0.1) {
    const impact = Math.abs(revenueDeltaPct * margin);
    recommendations.push({
      type: "REDUCE_PRODUCTION",
      title: "Reduce production to align with declining demand",
      description:
        "Revenue is declining meaningfully. Reducing production and variable costs can prevent excess inventory and protect margins.",
      confidence: 0.7,
      financialImpact: impact,
      justification: `Revenue declined ${Math.round(
        revenueDeltaPct * 100
      )}% in the last 30 days.`,
    });
  }

  if (margin / Math.max(totalRevenue, 1) < 0.25 && totalExpenses > totalRevenue * 0.7) {
    const impact = totalExpenses - totalRevenue * 0.7;
    recommendations.push({
      type: "REVENUE_LEAKAGE",
      title: "Investigate revenue leakage and cost overruns",
      description:
        "Margins are compressed, suggesting potential revenue leakage or structural cost issues. Review discounting, renewals, and cost drivers.",
      confidence: 0.85,
      financialImpact: impact,
      justification: `Current margin is ${Math.round(
        (margin / Math.max(totalRevenue, 1)) * 100
      )}% with expenses consuming ${Math.round(
        (totalExpenses / Math.max(totalRevenue, 1)) * 100
      )}% of revenue.`,
    });
  }

  const highGrowthSegments = identifyHighGrowthSegments(input.revenue);
  if (highGrowthSegments.length > 0) {
    const impact = highGrowthSegments.reduce((s, seg) => s + seg.revenueDelta, 0);
    recommendations.push({
      type: "GROWTH_SEGMENTS",
      title: "Double down on fastest-growing segments",
      description:
        "Certain customer or product segments are growing significantly faster than the rest of the business. Prioritize GTM and product investments there.",
      confidence: 0.8,
      financialImpact: impact,
      justification: highGrowthSegments
        .map(
          (s) =>
            `${s.segment} grew ${Math.round(s.revenueDeltaPct * 100)}% (${Math.round(
              s.revenueDelta
            )} incremental revenue)`
        )
        .join("; "),
    });
  }

  return recommendations;
}

function sumLastNDays(revenue: Revenue[], days: number): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return revenue
    .filter((r) => r.date >= cutoff)
    .reduce((sum, r) => sum + r.amount, 0);
}

function sumPrevWindow(revenue: Revenue[], windowSize: number, offset: number): number {
  const end = new Date();
  end.setDate(end.getDate() - offset);
  const start = new Date(end);
  start.setDate(start.getDate() - windowSize);
  return revenue
    .filter((r) => r.date >= start && r.date < end)
    .reduce((sum, r) => sum + r.amount, 0);
}

function computePipelineQuality(deals: Deal[]) {
  if (deals.length === 0) {
    return {
      lowQualityRatio: 0,
      highQualityRatio: 0,
    };
  }
  let low = 0;
  let high = 0;
  for (const d of deals) {
    const stage = d.stage.toLowerCase();
    if (stage.includes("qualified") || stage.includes("proposal") || stage.includes("negotiation")) {
      high += 1;
    } else if (stage.includes("unqualified") || stage.includes("lost")) {
      low += 1;
    }
  }
  const total = deals.length;
  return {
    lowQualityRatio: low / total,
    highQualityRatio: high / total,
  };
}

function identifyHighGrowthSegments(revenue: Revenue[]) {
  const segments = new Map<
    string,
    { recent: number; previous: number }
  >();
  const now = new Date();
  const recentCutoff = new Date();
  recentCutoff.setDate(now.getDate() - 30);
  const prevCutoff = new Date();
  prevCutoff.setDate(now.getDate() - 60);

  for (const r of revenue) {
    const seg = r.segment ?? "Unspecified";
    const bucket = segments.get(seg) ?? { recent: 0, previous: 0 };
    if (r.date >= recentCutoff) {
      bucket.recent += r.amount;
    } else if (r.date >= prevCutoff && r.date < recentCutoff) {
      bucket.previous += r.amount;
    }
    segments.set(seg, bucket);
  }

  const result: {
    segment: string;
    revenueDelta: number;
    revenueDeltaPct: number;
  }[] = [];

  for (const [segment, stats] of segments.entries()) {
    if (stats.previous === 0 && stats.recent === 0) continue;
    const delta = stats.recent - stats.previous;
    const deltaPct = stats.previous === 0 ? 1 : delta / stats.previous;
    if (deltaPct > 0.25 && delta > 10000) {
      result.push({
        segment,
        revenueDelta: delta,
        revenueDeltaPct: deltaPct,
      });
    }
  }

  return result;
}

