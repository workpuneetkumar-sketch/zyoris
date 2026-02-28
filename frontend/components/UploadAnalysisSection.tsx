"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import type { DataSenseReportData } from "./DataSenseReport";

export interface UploadAnalysisData {
  totalRows: number;
  totalValue: number;
  growthPercent: number | null;
  topProducts: { name: string; value: number }[];
  byCategory: { name: string; value: number }[];
  revenueOverTime: { date: string; value: number }[];
  monthlyComparison: { month: string; value: number }[];
  summary: string;
  detectedColumns: {
    dateKey: string | null;
    amountKey: string | null;
    productKey: string | null;
    categoryKey: string | null;
    allKeys: string[];
  };
  dataSenseReport?: DataSenseReportData;
}

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export function UploadAnalysisSection({ analysis }: { analysis: UploadAnalysisData }) {
  const timeData = analysis.revenueOverTime?.length
    ? analysis.revenueOverTime
    : analysis.monthlyComparison?.length
    ? analysis.monthlyComparison.map((d) => ({ date: d.month, value: d.value }))
    : [];
  const barData = (analysis.topProducts ?? []).slice(0, 8);
  const pieData = (analysis.byCategory ?? []).slice(0, 8);

  return (
    <div className="upload-analysis-section" style={{ marginTop: "1.5rem" }}>
      <div className="panel-title" style={{ marginBottom: "0.75rem" }}>
        Analysis from your file
      </div>

      <p
        className="upload-analysis-summary"
        style={{
          fontSize: "0.95rem",
          color: "#e5e7eb",
          lineHeight: 1.5,
          marginBottom: "1.25rem",
          padding: "0.75rem 1rem",
          background: "rgba(59, 130, 246, 0.1)",
          borderRadius: "8px",
          borderLeft: "3px solid #3b82f6",
        }}
      >
        {analysis.summary}
      </p>

      <div className="cards-grid" style={{ marginBottom: "1.25rem" }}>
        <div className="card">
          <div className="card-title">Total value</div>
          <div className="card-metric">
            {analysis.totalValue >= 1000
              ? `$${(analysis.totalValue / 1000).toFixed(1)}k`
              : `$${Math.round(analysis.totalValue)}`}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Rows analyzed</div>
          <div className="card-metric">{analysis.totalRows}</div>
        </div>
        <div className="card">
          <div className="card-title">Trend</div>
          <div
            className={`card-metric ${analysis.growthPercent != null && analysis.growthPercent >= 0 ? "metric-positive" : "metric-negative"}`}
          >
            {analysis.growthPercent != null
              ? `${analysis.growthPercent >= 0 ? "+" : ""}${analysis.growthPercent}%`
              : "—"}
          </div>
          <div className="card-trend" style={{ fontSize: "0.8rem" }}>
            Month-over-month
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
        {timeData.length > 0 && (
          <div className="panel" style={{ padding: "1rem" }}>
            <div className="panel-title" style={{ marginBottom: "0.5rem" }}>
              Value over time
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickFormatter={(v) => String(v).slice(0, 7)} />
                <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                <Tooltip
                  contentStyle={{ background: "#1f2937", border: "1px solid #374151" }}
                  formatter={(val: number) => [typeof val === "number" ? val.toLocaleString() : val, "Value"]}
                />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Value" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {barData.length > 0 && (
          <div className="panel" style={{ padding: "1rem" }}>
            <div className="panel-title" style={{ marginBottom: "0.5rem" }}>
              Top items by value
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" fontSize={11} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={11} width={100} tickFormatter={(v) => (v.length > 12 ? v.slice(0, 12) + "…" : v)} />
                <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151" }} />
                <Bar dataKey="value" fill="#10b981" name="Value" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {pieData.length > 0 && (
        <div className="panel" style={{ padding: "1rem", maxWidth: 420 }}>
          <div className="panel-title" style={{ marginBottom: "0.5rem" }}>
            By category
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name?.slice(0, 10)} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#1f2937", border: "1px solid #374151" }}
                formatter={(val: number) => [typeof val === "number" ? val.toLocaleString() : val, "Value"]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
