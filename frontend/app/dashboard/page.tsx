"use client";

import { AppShell } from "../../components/Shell";
import { useAuth, useAuthorizedClient } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadPanel } from "../../components/UploadPanel";
import { UploadAnalysisSection, type UploadAnalysisData } from "../../components/UploadAnalysisSection";
import { DataSenseReport } from "../../components/DataSenseReport";

interface CEOOverview {
  revenueForecast: {
    stats: { trend: string; slope: number; intercept: number };
  };
  riskIndicators: {
    demandTrend: string;
    marginPct: number;
  };
  kpis: {
    totalRevenue: number;
    margin: number;
    marketingRoi: number | null;
  };
}

interface Recommendation {
  type: string;
  title: string;
  description: string;
  confidence: number;
  financialImpact: number;
  justification: string;
}

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const router = useRouter();
  const client = useAuthorizedClient();
  const [ceoData, setCeoData] = useState<CEOOverview | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [uploadAnalysis, setUploadAnalysis] = useState<UploadAnalysisData | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  useEffect(() => {
    async function load() {
      try {
        const [ceoRes, recRes, analysisRes] = await Promise.all([
          client.get<CEOOverview>("/dashboard/ceo"),
          client.get<Recommendation[]>("/recommendations"),
          client.get<UploadAnalysisData>("/ingestion/last-analysis").catch(() => ({ data: null })),
        ]);
        setCeoData(ceoRes.data);
        setRecommendations(recRes.data);
        if (analysisRes.data && !Array.isArray(analysisRes.data)) setUploadAnalysis(analysisRes.data as UploadAnalysisData);
      } catch {
        // ignore for now
      }
    }
    load();
  }, [client]);

  if (!user) return null;

  const marginPct = ceoData?.riskIndicators.marginPct ?? 0;
  const marginClass = marginPct >= 0.3 ? "metric-positive" : "metric-negative";
  const demandTrend = ceoData?.riskIndicators.demandTrend ?? "flat";

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <div className="topbar-title">Executive overview</div>
          <div className="topbar-subtitle">
            Unified signal across CRM, ERP, Accounting, Marketing, and Inventory.
          </div>
        </div>
        <div className="topbar-actions">
          <div className="pill">Central Intelligence · v3</div>
          <button className="btn-secondary">Export briefing</button>
        </div>
      </div>

      <div className="cards-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Revenue run-rate</div>
            <span className="pill-badge">CEO</span>
          </div>
          <div className="card-metric">
            ${Math.round((ceoData?.kpis.totalRevenue ?? 120000) / 1000)}k
          </div>
          <div className="card-trend metric-positive">
            {ceoData?.revenueForecast.stats.trend === "upward"
              ? "Upward trajectory in next 90 days"
              : ceoData?.revenueForecast.stats.trend === "downward"
              ? "Forecasted softening trend"
              : "Stable near-term outlook"}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Gross margin</div>
            <span className="pill-badge">CFO</span>
          </div>
          <div className={`card-metric ${marginClass}`}>
            {Math.round((marginPct || 0.42) * 100)}%
          </div>
          <div className="card-trend">
            Margin health is{" "}
            <span className={marginClass}>
              {marginPct >= 0.3 ? "within target band" : "under compression"}
            </span>
            .
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Demand signal</div>
            <span className="pill-badge">Operations</span>
          </div>
          <div className="card-metric">
            {demandTrend === "increasing"
              ? "↑ Strengthening"
              : demandTrend === "decreasing"
              ? "↓ Softening"
              : "→ Stable"}
          </div>
          <div className="card-trend">
            Based on multi-system telemetry from bookings and inventory coverage.
          </div>
        </div>
      </div>

      <div className="recommendations-panel">
        <div className="recommendation-list">
          <div className="panel-title">Strategic recommendations</div>
          {recommendations.length === 0 && (
            <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
              No material recommendations yet. Trigger an ingestion run from the backend to
              populate sample data.
            </div>
          )}
          {recommendations.map((rec) => (
            <div key={rec.title} className="recommendation-item">
              <div className="recommendation-item-header">
                <div className="recommendation-title">{rec.title}</div>
                <div className="recommendation-conf">
                  Confidence · {Math.round(rec.confidence * 100)}%
                </div>
              </div>
              <div className="recommendation-body">{rec.description}</div>
              <div className="recommendation-footer">
                <span>Impact ≈ ${Math.round(rec.financialImpact).toLocaleString()}</span>
                <span>{rec.justification}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="panel-title">Risk indicators</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
              <span>Demand trend</span>
              <span>
                {demandTrend === "increasing"
                  ? "Strengthening"
                  : demandTrend === "decreasing"
                  ? "Softening"
                  : "Stable"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
              <span>Marketing ROI</span>
              <span>
                {ceoData?.kpis.marketingRoi != null
                  ? `${ceoData.kpis.marketingRoi.toFixed(2)}x`
                  : "N/A"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
              <span>AI recommendation volume</span>
              <span>{recommendations.length} active suggestions</span>
            </div>
          </div>
        </div>
      </div>

      <UploadPanel onAnalysis={setUploadAnalysis} />
      {uploadAnalysis && <UploadAnalysisSection analysis={uploadAnalysis} />}
      {uploadAnalysis?.dataSenseReport && (
        <DataSenseReport report={uploadAnalysis.dataSenseReport} />
      )}
    </AppShell>
  );
}

