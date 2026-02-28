/**
 * DataSense AI – Intelligent Performance Analyst
 * Generates structured, paragraph-based business analysis from uploaded file data.
 */

import type { DetectedColumns, UploadAnalysis } from "./fileAnalysisService";

export type DatasetType =
  | "sales"
  | "marketing"
  | "inventory"
  | "finance"
  | "hr"
  | "rate_card"
  | "general";

export interface DataSenseReport {
  datasetType: DatasetType;
  section1_datasetOverview: string;
  section2_performanceAnalysis: string;
  section3_issuesWeaknesses: string;
  section4_dataQualityAssessment: string;
  section5_improvementRecommendations: string;
  section6_riskAssessment: string;
  section7_executiveSummary: string;
}

function toNumber(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === "number" && !isNaN(val)) return val;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function toDate(val: unknown): Date | null {
  if (val == null) return null;
  if (typeof val === "number" && val > 10000) {
    const d = new Date((val - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? null : d;
}

function isEmpty(val: unknown): boolean {
  if (val == null) return true;
  const s = String(val).trim();
  return s === "" || s.toLowerCase() === "null" || s === "—" || s === "n/a";
}

function classifyDatasetType(
  rows: Record<string, unknown>[],
  detected: DetectedColumns
): DatasetType {
  const headers = detected.allKeys.join(" ").toLowerCase();
  const first = rows[0] ?? {};
  const sample = rows.slice(0, 20);

  if (
    /rate|pricing|tier|list\s*price|mrp|unit\s*price|per\s*unit/.test(headers) &&
    (/product|service|item|sku|plan/.test(headers) || Object.keys(first).some((k) => /product|service|item|plan/i.test(k)))
  ) {
    return "rate_card";
  }
  if (/campaign|channel|impression|click|conversion|ctr|cpc|cpm|roas/.test(headers)) return "marketing";
  if (/stock|quantity|inventory|warehouse|reorder|sku|units\s*on\s*hand/.test(headers)) return "inventory";
  if (/revenue|sales|booking|deal|pipeline|opportunity|close\s*date/.test(headers)) return "sales";
  if (/salary|employee|headcount|attrition|hire|department|payroll/.test(headers)) return "hr";
  if (/cost|expense|margin|profit|revenue|balance|invoice|payable/.test(headers)) return "finance";
  return "general";
}

function computeDataQuality(
  rows: Record<string, unknown>[],
  detected: DetectedColumns
): {
  missingPercentByColumn: { column: string; percent: number }[];
  overallMissingPercent: number;
  duplicateRowCount: number;
  duplicatePercent: number;
  incompleteColumns: string[];
  totalCells: number;
  missingCells: number;
} {
  const cols = detected.allKeys;
  const totalCells = rows.length * cols.length;
  let missingCells = 0;
  const missingByCol: { column: string; count: number }[] = cols.map((c) => ({ column: c, count: 0 }));

  const rowSignatures = new Map<string, number>();
  for (const row of rows) {
    const sig = cols.map((c) => String(row[c] ?? "")).join("|");
    rowSignatures.set(sig, (rowSignatures.get(sig) ?? 0) + 1);
    for (let i = 0; i < cols.length; i++) {
      if (isEmpty(row[cols[i]])) {
        missingCells++;
        missingByCol[i].count++;
      }
    }
  }

  let duplicateRowCount = 0;
  for (const count of rowSignatures.values()) {
    if (count > 1) duplicateRowCount += count - 1;
  }

  const missingPercentByColumn = missingByCol.map(({ column, count }) => ({
    column,
    percent: rows.length > 0 ? Math.round((count / rows.length) * 1000) / 10 : 0,
  }));

  const incompleteColumns = missingPercentByColumn.filter((c) => c.percent > 0).map((c) => c.column);
  const overallMissingPercent = totalCells > 0 ? Math.round((missingCells / totalCells) * 1000) / 10 : 0;

  return {
    missingPercentByColumn,
    overallMissingPercent,
    duplicateRowCount,
    duplicatePercent: rows.length > 0 ? Math.round((duplicateRowCount / rows.length) * 1000) / 10 : 0,
    incompleteColumns,
    totalCells,
    missingCells,
  };
}

function computePerformanceExtras(analysis: UploadAnalysis): {
  trendDirection: "improving" | "declining" | "stable";
  volatility: number | null;
  monthOverMonthDrops: number;
  topProductConcentrationPercent: number;
  bottomPerformers: { name: string; value: number }[];
  periodStart: string | null;
  periodEnd: string | null;
} {
  const monthly = analysis.monthlyComparison;
  const timeSeries = analysis.revenueOverTime?.length ? analysis.revenueOverTime : monthly.map((m) => ({ date: m.month, value: m.value }));
  const values = timeSeries.map((d) => d.value).filter((v) => v > 0);

  let trendDirection: "improving" | "declining" | "stable" = "stable";
  if (analysis.growthPercent != null) {
    if (analysis.growthPercent > 5) trendDirection = "improving";
    else if (analysis.growthPercent < -5) trendDirection = "declining";
  }

  let volatility: number | null = null;
  if (values.length >= 2) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    volatility = mean > 0 ? Math.round((Math.sqrt(variance) / mean) * 1000) / 10 : null;
  }

  let monthOverMonthDrops = 0;
  for (let i = 1; i < monthly.length; i++) {
    const prev = monthly[i - 1].value;
    const curr = monthly[i].value;
    if (prev > 0 && curr < prev && (prev - curr) / prev > 0.1) monthOverMonthDrops++;
  }

  const topProduct = analysis.topProducts[0];
  const topProductConcentrationPercent =
    topProduct && analysis.totalValue > 0
      ? Math.round((topProduct.value / analysis.totalValue) * 1000) / 10
      : 0;

  const bottomPerformers = analysis.topProducts.length > 3
    ? [...analysis.topProducts].sort((a, b) => a.value - b.value).slice(0, 3)
    : [];

  const periodStart = timeSeries.length > 0 ? timeSeries[0].date : null;
  const periodEnd = timeSeries.length > 0 ? timeSeries[timeSeries.length - 1].date : null;

  return {
    trendDirection,
    volatility,
    monthOverMonthDrops,
    topProductConcentrationPercent,
    bottomPerformers,
    periodStart,
    periodEnd,
  };
}

export function generateDataSenseReport(
  rows: Record<string, unknown>[],
  analysis: UploadAnalysis
): DataSenseReport {
  const detected = analysis.detectedColumns;
  const datasetType = classifyDatasetType(rows, detected);
  const quality = computeDataQuality(rows, detected);
  const perf = computePerformanceExtras(analysis);

  const formatValue = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0);

  const section1_datasetOverview = buildSection1(
    datasetType,
    rows.length,
    detected.allKeys.length,
    quality,
    perf.periodStart,
    perf.periodEnd
  );

  const section2_performanceAnalysis = buildSection2(
    analysis,
    perf,
    datasetType,
    formatValue
  );

  const section3_issuesWeaknesses = buildSection3(
    analysis,
    perf,
    quality,
    datasetType,
    formatValue
  );

  const section4_dataQualityAssessment = buildSection4(quality, rows.length, detected.allKeys.length);

  const section5_improvementRecommendations = buildSection5(
    analysis,
    perf,
    datasetType,
    quality
  );

  const section6_riskAssessment = buildSection6(analysis, perf, datasetType);

  const section7_executiveSummary = buildSection7(
    datasetType,
    analysis,
    perf,
    quality,
    formatValue
  );

  return {
    datasetType,
    section1_datasetOverview,
    section2_performanceAnalysis,
    section3_issuesWeaknesses,
    section4_dataQualityAssessment,
    section5_improvementRecommendations,
    section6_riskAssessment,
    section7_executiveSummary,
  };
}

function buildSection1(
  datasetType: DatasetType,
  rowCount: number,
  colCount: number,
  quality: ReturnType<typeof computeDataQuality>,
  periodStart: string | null,
  periodEnd: string | null
): string {
  const typeLabel =
    datasetType === "rate_card"
      ? "rate card or pricing"
      : datasetType === "sales"
      ? "sales or revenue"
      : datasetType === "marketing"
      ? "marketing and campaigns"
      : datasetType === "inventory"
      ? "inventory and stock"
      : datasetType === "finance"
      ? "financial"
      : datasetType === "hr"
      ? "HR or workforce"
      : "operational";
  const period =
    periodStart && periodEnd
      ? `The data covers the period from ${periodStart} to ${periodEnd}.`
      : "No clear date range could be inferred from the dataset.";
  return `This dataset represents ${typeLabel} data. It contains ${rowCount} rows and ${colCount} columns. ${period} The business area is consistent with ${typeLabel} operations, suitable for performance and trend analysis.`;
}

function buildSection2(
  analysis: UploadAnalysis,
  perf: ReturnType<typeof computePerformanceExtras>,
  datasetType: DatasetType,
  formatValue: (v: number) => string
): string {
  const parts: string[] = [];
  const valueLabel = datasetType === "sales" ? "Revenue" : datasetType === "marketing" ? "Spend or ROI" : "Value";
  parts.push(
    `Overall performance is ${perf.trendDirection}. Total ${valueLabel.toLowerCase()} across the dataset is ${formatValue(analysis.totalValue)}.`
  );
  if (analysis.growthPercent != null) {
    parts.push(
      `Month-over-month trend is ${analysis.growthPercent >= 0 ? "positive" : "negative"} at ${analysis.growthPercent >= 0 ? "+" : ""}${analysis.growthPercent}%.`
    );
  }
  if (analysis.topProducts.length > 0) {
    const top = analysis.topProducts.slice(0, 3);
    const names = top.map((t) => `"${t.name}"`).join(", ");
    parts.push(`Best-performing items by ${valueLabel.toLowerCase()} are ${names}.`);
  }
  if (perf.bottomPerformers.length > 0) {
    const names = perf.bottomPerformers.map((b) => `"${b.name}"`).join(", ");
    parts.push(`Underperforming items include ${names}; these warrant review for optimisation or discontinuation.`);
  }
  if (analysis.monthlyComparison.length >= 2) {
    parts.push(
      `The time series shows ${perf.trendDirection} momentum in the most recent periods.`
    );
  }
  return parts.join(" ");
}

function buildSection3(
  analysis: UploadAnalysis,
  perf: ReturnType<typeof computePerformanceExtras>,
  quality: ReturnType<typeof computeDataQuality>,
  datasetType: DatasetType,
  formatValue: (v: number) => string
): string {
  const parts: string[] = [];
  if (perf.monthOverMonthDrops > 0) {
    parts.push(
      `There are ${perf.monthOverMonthDrops} notable month-over-month drops (over 10% decline), indicating potential volatility or seasonal effects.`
    );
  }
  if (perf.topProductConcentrationPercent > 40) {
    parts.push(
      `Revenue concentration risk: the top single item contributes ${perf.topProductConcentrationPercent}% of total value. The business is highly dependent on this product or segment.`
    );
  }
  if (analysis.byCategory.length > 0) {
    const topCat = analysis.byCategory[0];
    const topCatShare = analysis.totalValue > 0
      ? Math.round((topCat.value / analysis.totalValue) * 100)
      : 0;
    if (topCatShare > 50) {
      parts.push(
        `Category concentration is high: "${topCat.name}" represents ${topCatShare}% of the total. Diversification could reduce risk.`
      );
    }
  }
  if (quality.duplicatePercent > 5) {
    parts.push(
      `Data consistency issue: approximately ${quality.duplicatePercent}% of rows appear to be duplicates, which may inflate or distort metrics.`
    );
  }
  if (parts.length === 0) {
    parts.push(
      "No major weaknesses or anomalies were detected. Performance distribution appears relatively balanced. Monitor concentration and month-over-month changes as the dataset grows."
    );
  }
  return parts.join(" ");
}

function buildSection4(
  quality: ReturnType<typeof computeDataQuality>,
  rowCount: number,
  colCount: number
): string {
  const parts: string[] = [];
  parts.push(
    `Across ${rowCount} rows and ${colCount} columns (${quality.totalCells} cells), the overall missing-value rate is ${quality.overallMissingPercent}%.`
  );
  if (quality.incompleteColumns.length > 0) {
    const worst = quality.missingPercentByColumn
      .filter((c) => c.percent > 0)
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 3);
    parts.push(
      `Columns with the most missing data: ${worst.map((c) => `${c.column} (${c.percent}%)`).join(", ")}.`
    );
  } else if (quality.overallMissingPercent === 0) {
    parts.push("No missing values were found; the dataset is complete for the fields analysed.");
  }
  if (quality.duplicateRowCount > 0) {
    parts.push(
      `There are ${quality.duplicateRowCount} duplicate rows (${quality.duplicatePercent}% of total). Consider deduplication before reporting.`
    );
  }
  if (quality.overallMissingPercent > 20 || quality.duplicatePercent > 10) {
    parts.push("Data quality should be improved before relying on this dataset for critical decisions.");
  }
  return parts.join(" ");
}

function buildSection5(
  analysis: UploadAnalysis,
  perf: ReturnType<typeof computePerformanceExtras>,
  datasetType: DatasetType,
  quality: ReturnType<typeof computeDataQuality>
): string {
  const parts: string[] = [];
  if (perf.trendDirection === "declining" && analysis.growthPercent != null) {
    parts.push("Prioritise initiatives to reverse the declining trend: review pricing, promotions, and product mix.");
  }
  if (perf.topProductConcentrationPercent > 40) {
    parts.push(
      "Diversify the portfolio to reduce dependency on the top product; develop or promote secondary offerings."
    );
  }
  if (perf.bottomPerformers.length > 0) {
    parts.push(
      "Review underperforming items: either improve positioning and support or phase out to focus resources on winners."
    );
  }
  if (datasetType === "sales") {
    parts.push("Optimise sales operations: align incentives with high-margin products and strengthen pipeline visibility.");
  }
  if (datasetType === "marketing") {
    parts.push("Improve marketing efficiency: reallocate spend toward channels and campaigns with the best conversion and ROI.");
  }
  if (datasetType === "inventory") {
    parts.push("Optimise stock levels: reduce dead stock and improve turnover for fast-moving items.");
  }
  if (quality.duplicatePercent > 5 || quality.overallMissingPercent > 10) {
    parts.push("Establish data governance: fix sources of duplicates and missing values so reporting is reliable.");
  }
  if (parts.length === 0) {
    parts.push(
      "Maintain current practices while monitoring key metrics. Introduce A/B tests or small experiments to identify further growth opportunities."
    );
  }
  return parts.join(" ");
}

function buildSection6(
  analysis: UploadAnalysis,
  perf: ReturnType<typeof computePerformanceExtras>,
  datasetType: DatasetType
): string {
  const parts: string[] = [];
  if (perf.topProductConcentrationPercent > 40) {
    parts.push(
      "Financial risk: high reliance on a single product or segment exposes the business to demand or competitive shocks."
    );
  }
  if (perf.volatility != null && perf.volatility > 25) {
    parts.push(
      `Operational volatility: value fluctuates with a coefficient of variation around ${perf.volatility}%, suggesting seasonal or irregular demand.`
    );
  }
  if (perf.monthOverMonthDrops >= 2) {
    parts.push(
      "Multiple period-over-period drops indicate potential cyclicality or one-off events; consider stress-testing plans for downturns."
    );
  }
  if (analysis.byCategory.length > 0 && analysis.totalValue > 0) {
    const topShare = (analysis.byCategory[0].value / analysis.totalValue) * 100;
    if (topShare > 60) {
      parts.push("Segment concentration risk: one category dominates; diversify customer or product mix to reduce exposure.");
    }
  }
  if (parts.length === 0) {
    parts.push(
      "No elevated risks were identified from this dataset. Continue to monitor concentration, volatility, and external factors."
    );
  }
  return parts.join(" ");
}

function buildSection7(
  datasetType: DatasetType,
  analysis: UploadAnalysis,
  perf: ReturnType<typeof computePerformanceExtras>,
  quality: ReturnType<typeof computeDataQuality>,
  formatValue: (v: number) => string
): string {
  const typeLabel =
    datasetType === "rate_card"
      ? "pricing and rate card"
      : datasetType === "sales"
      ? "sales"
      : datasetType === "marketing"
      ? "marketing"
      : datasetType === "inventory"
      ? "inventory"
      : datasetType === "finance"
      ? "financial"
      : datasetType === "hr"
      ? "HR"
      : "operational";
  const trend = perf.trendDirection === "improving" ? "positive" : perf.trendDirection === "declining" ? "negative" : "stable";
  const growthLine =
    analysis.growthPercent != null
      ? ` Latest trend is ${analysis.growthPercent >= 0 ? "+" : ""}${analysis.growthPercent}% month-over-month.`
      : "";
  const qualityLine =
    quality.overallMissingPercent > 15 || quality.duplicatePercent > 10
      ? " Data quality should be improved for decision-making."
      : " Data quality is acceptable for analysis.";
  return `This ${typeLabel} dataset shows total value of ${formatValue(analysis.totalValue)} across ${analysis.totalRows} records, with a ${trend} performance trajectory.${growthLine} Key risks include concentration in top products or categories where applicable.${qualityLine} Suitable for high-level investor or board briefing when combined with contextual narrative.`;
}
