/**
 * Analyzes uploaded file rows by auto-detecting column types and computing
 * aggregates, time series, top items, and a human-readable summary.
 */

export interface DetectedColumns {
  /** Raw header names from the file (for row lookups) */
  dateKey: string | null;
  amountKey: string | null;
  productKey: string | null;
  categoryKey: string | null;
  allKeys: string[];
}

export interface UploadAnalysis {
  totalRows: number;
  totalValue: number;
  growthPercent: number | null;
  topProducts: { name: string; value: number }[];
  byCategory: { name: string; value: number }[];
  revenueOverTime: { date: string; value: number }[];
  monthlyComparison: { month: string; value: number }[];
  summary: string;
  detectedColumns: DetectedColumns;
}

function normalizeKey(s: string): string {
  return s.toString().trim().toLowerCase().replace(/\s+/g, "_");
}

function isDateLike(val: unknown): boolean {
  if (val == null) return false;
  if (typeof val === "number") return val > 10000 && val < 100000; // Excel serial
  const d = new Date(val as string | number);
  return !isNaN(d.getTime());
}

function toNumber(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === "number" && !isNaN(val)) return val;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function toDate(val: unknown): Date | null {
  if (val == null) return null;
  if (typeof val === "number") {
    // Excel serial date
    if (val > 10000) {
      const d = new Date((val - 25569) * 86400 * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? null : d;
}

export function detectColumns(rows: Record<string, unknown>[]): DetectedColumns {
  if (rows.length === 0) return { dateKey: null, amountKey: null, productKey: null, categoryKey: null, allKeys: [] };
  const first = rows[0];
  const rawKeys = Object.keys(first);
  const allKeys = rawKeys.slice();

  const datePatterns = /date|month|day|time|period|created|updated/i;
  const amountPatterns = /amount|value|price|rate|revenue|sales|total|cost|fee|charges|mrp|list\s*price/i;
  const productPatterns = /product|item|sku|name|service|plan|description|tier|package/i;
  const categoryPatterns = /category|type|segment|tier|region|department|group|class/i;

  let dateKey: string | null = null;
  let amountKey: string | null = null;
  let productKey: string | null = null;
  let categoryKey: string | null = null;

  for (const raw of rawKeys) {
    if (datePatterns.test(raw) && !dateKey) {
      const sample = rows.slice(0, 5).map((row) => row[raw]);
      if (sample.some(isDateLike)) dateKey = raw;
    }
    if (amountPatterns.test(raw) && !amountKey) {
      const sample = rows.slice(0, 10).map((row) => toNumber(row[raw]));
      if (sample.some((n) => n > 0)) amountKey = raw;
    }
    if (productPatterns.test(raw) && !productKey) productKey = raw;
    if (categoryPatterns.test(raw) && !categoryKey) categoryKey = raw;
  }

  if (!amountKey) {
    for (const raw of rawKeys) {
      const sample = rows.slice(0, 10).map((row) => toNumber(row[raw]));
      if (sample.some((n) => n > 0)) {
        amountKey = raw;
        break;
      }
    }
  }

  return { dateKey, amountKey, productKey, categoryKey, allKeys };
}

export function analyzeRows(
  rows: Record<string, unknown>[],
  detected: DetectedColumns
): Omit<UploadAnalysis, "detectedColumns"> {
  const { dateKey, amountKey, productKey, categoryKey } = detected;
  const totalRows = rows.length;
  let totalValue = 0;
  const byDate = new Map<string, number>();
  const byMonth = new Map<string, number>();
  const byProduct = new Map<string, number>();
  const byCategory = new Map<string, number>();

  const getVal = (row: Record<string, unknown>, key: string | null): string =>
    key ? String(row[key] ?? "").trim() || "—" : "—";

  for (const row of rows) {
    const amount = amountKey ? toNumber(row[amountKey]) : 0;
    totalValue += amount;

    const date = dateKey ? toDate(row[dateKey]) : null;
    if (date) {
      const dStr = date.toISOString().slice(0, 10);
      byDate.set(dStr, (byDate.get(dStr) ?? 0) + amount);
      const mStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      byMonth.set(mStr, (byMonth.get(mStr) ?? 0) + amount);
    }

    const product = getVal(row, productKey);
    if (product) byProduct.set(product, (byProduct.get(product) ?? 0) + amount);
    const category = getVal(row, categoryKey);
    byCategory.set(category, (byCategory.get(category) ?? 0) + amount);
  }

  const revenueOverTime = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));

  const monthlyComparison = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month, value }));

  const topProducts = Array.from(byProduct.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const byCategoryArr = Array.from(byCategory.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  let growthPercent: number | null = null;
  if (monthlyComparison.length >= 2) {
    const last = monthlyComparison[monthlyComparison.length - 1].value;
    const prev = monthlyComparison[monthlyComparison.length - 2].value;
    growthPercent = prev > 0 ? Math.round(((last - prev) / prev) * 1000) / 10 : null;
  }

  const topProduct = topProducts[0];
  const bestCategory = byCategoryArr[0];
  const summary = buildSummary({
    totalValue,
    totalRows,
    growthPercent,
    topProduct: topProduct?.name ?? "—",
    topProductShare: topProduct && totalValue > 0 ? Math.round((topProduct.value / totalValue) * 100) : 0,
    bestCategory: bestCategory?.name ?? "—",
    categoryCount: byCategoryArr.length,
  });

  return {
    totalRows,
    totalValue,
    growthPercent,
    topProducts,
    byCategory: byCategoryArr,
    revenueOverTime,
    monthlyComparison,
    summary,
  };
}

function buildSummary(p: {
  totalValue: number;
  totalRows: number;
  growthPercent: number | null;
  topProduct: string;
  topProductShare: number;
  bestCategory: string;
  categoryCount: number;
}): string {
  const parts: string[] = [];
  parts.push(
    `Total value across ${p.totalRows} rows is ${p.totalValue >= 1000 ? `$${(p.totalValue / 1000).toFixed(1)}k` : `$${p.totalValue.toFixed(0)}`}.`
  );
  if (p.growthPercent != null) {
    const trend = p.growthPercent >= 0 ? "increased" : "decreased";
    parts.push(`Month-over-month trend ${trend} by ${Math.abs(p.growthPercent)}%.`);
  }
  if (p.topProduct && p.topProduct !== "—") {
    parts.push(`Top performer is "${p.topProduct}" contributing ${p.topProductShare}% of total.`);
  }
  if (p.bestCategory && p.bestCategory !== "—") {
    parts.push(`Strongest category is ${p.bestCategory}.`);
  }
  return parts.join(" ");
}
