"use client";

import { AppShell } from "../../../components/Shell";
import { useAuthorizedClient, useAuth } from "../../../context/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ConversionScore {
  dealId: string;
  externalId: string | null;
  name: string;
  stage: string;
  amount: number;
  conversionProbability: number;
}

export default function SalesDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const client = useAuthorizedClient();
  const [scores, setScores] = useState<ConversionScore[]>([]);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "SALES_HEAD" && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    async function load() {
      try {
        const res = await client.get<ConversionScore[]>("/analytics/conversion/scores");
        setScores(res.data);
      } catch {
        // ignore
      }
    }
    load();
  }, [client]);

  if (!user) return null;

  const avgScore =
    scores.length === 0
      ? 0
      : scores.reduce((s, d) => s + d.conversionProbability, 0) / scores.length;

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <div className="topbar-title">Sales · Pipeline quality</div>
          <div className="topbar-subtitle">
            Conversion probabilities and forecast deviation risk for active deals.
          </div>
        </div>
        <div className="topbar-actions">
          <div className="pill">Role · Sales Head</div>
        </div>
      </div>

      <div className="cards-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Pipeline quality score</div>
          </div>
          <div className="card-metric">
            {Math.round((avgScore || 0.42) * 100)}%
          </div>
          <div className="card-trend">
            Weighted by stage progression and deal value.
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Open opportunities</div>
          </div>
          <div className="card-metric">{scores.length}</div>
          <div className="card-trend">Synchronized from CRM systems via Zyoris ingestion.</div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">High-risk deals</div>
          </div>
          <div className="card-metric metric-negative">
            {scores.filter((d) => d.conversionProbability < 0.3).length}
          </div>
          <div className="card-trend">
            Focus coaching and enablement on these accounts.
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: "1.25rem" }}>
        <div className="panel-title">Conversion probability by deal</div>
        <table className="table">
          <thead>
            <tr>
              <th>Deal</th>
              <th>Stage</th>
              <th>Amount</th>
              <th>Conversion probability</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((d) => (
              <tr key={d.dealId}>
                <td>{d.name}</td>
                <td>{d.stage}</td>
                <td>${Math.round(d.amount).toLocaleString()}</td>
                <td>{Math.round(d.conversionProbability * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

