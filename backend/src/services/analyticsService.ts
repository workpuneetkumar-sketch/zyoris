import { Deal, Inventory, MarketingSpend, Revenue, Expense } from "@prisma/client";

interface TimeSeriesPoint {
  date: Date;
  value: number;
}

function buildTimeSeriesFromRevenue(revenue: Revenue[]): TimeSeriesPoint[] {
  const byDate = new Map<string, number>();
  for (const r of revenue) {
    const key = r.date.toISOString().substring(0, 10);
    byDate.set(key, (byDate.get(key) ?? 0) + r.amount);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, value]) => ({ date: new Date(date), value }));
}

function movingAverage(series: TimeSeriesPoint[], window: number): TimeSeriesPoint[] {
  const result: TimeSeriesPoint[] = [];
  for (let i = 0; i < series.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = series.slice(start, i + 1);
    const avg = slice.reduce((sum, p) => sum + p.value, 0) / slice.length;
    result.push({ date: series[i].date, value: avg });
  }
  return result;
}

function linearRegression(series: TimeSeriesPoint[]): { slope: number; intercept: number } {
  const n = series.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  const xs = series.map((_p, idx) => idx);
  const ys = series.map((p) => p.value);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  return { slope, intercept };
}

export function buildRevenueForecast(revenue: Revenue[], horizonDays: number) {
  const series = buildTimeSeriesFromRevenue(revenue);
  const smoothed = movingAverage(series, 7);
  const { slope, intercept } = linearRegression(smoothed);

  const lastIndex = smoothed.length - 1;
  const lastDate = smoothed[lastIndex]?.date ?? new Date();
  const forecast: TimeSeriesPoint[] = [];
  for (let i = 1; i <= horizonDays; i++) {
    const idx = lastIndex + i;
    const value = slope * idx + intercept;
    const date = new Date(lastDate);
    date.setDate(date.getDate() + i);
    forecast.push({ date, value: Math.max(0, value) });
  }

  return {
    historical: smoothed,
    forecast,
    stats: {
      slope,
      intercept,
      trend: slope > 0 ? "upward" : slope < 0 ? "downward" : "flat",
    },
  };
}

export function computeDemandTrends(inventory: Inventory[], revenue: Revenue[]) {
  const series = buildTimeSeriesFromRevenue(revenue);
  const { slope } = linearRegression(series);

  const inventoryRisk = inventory.map((item) => {
    const coverageRatio = item.quantity / Math.max(item.safetyStock, 1);
    let risk: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    if (coverageRatio < 0.8) risk = "HIGH";
    else if (coverageRatio < 1.2) risk = "MEDIUM";
    return {
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      safetyStock: item.safetyStock,
      coverageRatio,
      risk,
    };
  });

  return {
    demandTrend: slope > 0 ? "increasing" : slope < 0 ? "decreasing" : "flat",
    slope,
    inventoryRisk,
  };
}

export function clusterSegments(revenue: Revenue[]) {
  const bySegment = new Map<string, { total: number; count: number }>();
  for (const r of revenue) {
    const seg = r.segment ?? "Unspecified";
    const current = bySegment.get(seg) ?? { total: 0, count: 0 };
    current.total += r.amount;
    current.count += 1;
    bySegment.set(seg, current);
  }

  const clusters = Array.from(bySegment.entries()).map(([segment, stats]) => {
    const avg = stats.total / stats.count;
    let tier: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
    if (avg > 50000) tier = "HIGH";
    else if (avg < 10000) tier = "LOW";
    return {
      segment,
      averageRevenue: avg,
      tier,
      totalRevenue: stats.total,
      sampleSize: stats.count,
    };
  });

  return { clusters };
}

export function computeConversionScores(deals: Deal[]) {
  return deals.map((deal) => {
    let base = 0.2;
    if (deal.stage.toLowerCase().includes("qualified")) base += 0.2;
    if (deal.stage.toLowerCase().includes("proposal")) base += 0.2;
    if (deal.stage.toLowerCase().includes("negotiation")) base += 0.2;
    if (deal.stage.toLowerCase().includes("closed won")) base = 0.99;
    if (deal.stage.toLowerCase().includes("closed lost")) base = 0.01;

    const amountFactor = Math.min(deal.amount / 100000, 1);
    const score = Math.min(0.1 + base + 0.2 * amountFactor, 0.99);

    return {
      dealId: deal.id,
      externalId: deal.externalId,
      name: deal.name,
      stage: deal.stage,
      amount: deal.amount,
      conversionProbability: score,
    };
  });
}

export function computeRevenueDrivers(
  revenue: Revenue[],
  marketing: MarketingSpend[],
  expenses: Expense[]
) {
  const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
  const totalMarketing = marketing.reduce((sum, m) => sum + m.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const margin = totalRevenue - totalExpenses;
  const marginPct = totalRevenue === 0 ? 0 : margin / totalRevenue;
  const marketingRoi =
    totalMarketing === 0 ? null : (totalRevenue - totalMarketing) / totalMarketing;

  const byChannel = new Map<
    string,
    { spend: number; attributedRevenue: number }
  >();
  for (const m of marketing) {
    const key = m.channel;
    const entry = byChannel.get(key) ?? { spend: 0, attributedRevenue: 0 };
    entry.spend += m.amount;
    entry.attributedRevenue += m.amount * 4;
    byChannel.set(key, entry);
  }

  const channels = Array.from(byChannel.entries()).map(([channel, stats]) => {
    const roi =
      stats.spend === 0 ? null : (stats.attributedRevenue - stats.spend) / stats.spend;
    return {
      channel,
      spend: stats.spend,
      attributedRevenue: stats.attributedRevenue,
      roi,
    };
  });

  return {
    totals: {
      totalRevenue,
      totalMarketing,
      totalExpenses,
      margin,
      marginPct,
      marketingRoi,
    },
    channels,
  };
}

