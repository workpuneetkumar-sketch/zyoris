"use client";

import { AppShell } from "../../../components/Shell";
import { useAuthorizedClient, useAuth } from "../../../context/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Channel {
  channel: string;
  spend: number;
  attributedRevenue: number;
  roi: number | null;
}

interface Drivers {
  totals: {
    totalRevenue: number;
    totalMarketing: number;
    totalExpenses: number;
    margin: number;
    marginPct: number;
    marketingRoi: number | null;
  };
  channels: Channel[];
}

export default function CfoDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const client = useAuthorizedClient();
  const [drivers, setDrivers] = useState<Drivers | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "CFO" && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    async function load() {
      try {
        const res = await client.get<Drivers>("/analytics/revenue/drivers");
        setDrivers(res.data);
      } catch {
        // ignore
      }
    }
    load();
  }, [client]);

  if (!user) return null;

  const marginPct = drivers?.totals.marginPct ?? 0;

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <div className="topbar-title">CFO · Margin & spend</div>
          <div className="topbar-subtitle">
            Track margin health and marketing efficiency across the portfolio.
          </div>
        </div>
        <div className="topbar-actions">
          <div className="pill">Role · CFO</div>
        </div>
      </div>

      <div className="cards-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Gross margin</div>
          </div>
          <div className={`card-metric ${marginPct >= 0.3 ? "metric-positive" : "metric-negative"}`}>
            {Math.round((marginPct || 0) * 100)}%
          </div>
          <div className="card-trend">
            Margin dollars: ${Math.round(drivers?.totals.margin ?? 0).toLocaleString()}
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Marketing ROI</div>
          </div>
          <div className="card-metric">
            {(drivers?.totals.marketingRoi ?? 0).toFixed(2)}x
          </div>
          <div className="card-trend">
            Spend: ${Math.round(drivers?.totals.totalMarketing ?? 0).toLocaleString()}
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Expense envelope</div>
          </div>
          <div className="card-metric">
            ${Math.round(drivers?.totals.totalExpenses ?? 0).toLocaleString()}
          </div>
          <div className="card-trend">Includes payroll, COGS, and operating expenses.</div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: "1.25rem" }}>
        <div className="panel-title">Channel performance</div>
        <table className="table">
          <thead>
            <tr>
              <th>Channel</th>
              <th>Spend</th>
              <th>Attributed revenue</th>
              <th>ROI</th>
            </tr>
          </thead>
          <tbody>
            {(drivers?.channels ?? []).map((c) => (
              <tr key={c.channel}>
                <td>{c.channel}</td>
                <td>${Math.round(c.spend).toLocaleString()}</td>
                <td>${Math.round(c.attributedRevenue).toLocaleString()}</td>
                <td>{c.roi != null ? `${c.roi.toFixed(2)}x` : "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

