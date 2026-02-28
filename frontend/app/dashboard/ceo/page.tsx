"use client";

import { AppShell } from "../../../components/Shell";
import { useAuthorizedClient, useAuth } from "../../../context/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ForecastPoint {
  date: string;
  value: number;
}

interface ForecastResponse {
  historical: ForecastPoint[];
  forecast: ForecastPoint[];
  stats: { trend: string; slope: number; intercept: number };
}

export default function CeoDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const client = useAuthorizedClient();
  const [data, setData] = useState<ForecastResponse | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "CEO" && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    async function load() {
      try {
        const res = await client.get<ForecastResponse>("/analytics/revenue/forecast");
        setData(res.data);
      } catch {
        // ignore for now
      }
    }
    load();
  }, [client]);

  if (!user) return null;

  const horizon = data?.forecast ?? [];

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <div className="topbar-title">CEO · Revenue forecast</div>
          <div className="topbar-subtitle">
            90-day outlook powered by regression and moving averages.
          </div>
        </div>
        <div className="topbar-actions">
          <div className="pill">Role · CEO</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Forecast table (sample)</div>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Projected revenue</th>
            </tr>
          </thead>
          <tbody>
            {horizon.slice(0, 15).map((p) => (
              <tr key={p.date}>
                <td>{new Date(p.date).toLocaleDateString()}</td>
                <td>${Math.round(p.value).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

