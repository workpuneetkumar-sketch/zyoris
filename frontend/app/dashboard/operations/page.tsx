"use client";

import { AppShell } from "../../../components/Shell";
import { useAuthorizedClient, useAuth } from "../../../context/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface InventoryRisk {
  sku: string;
  name: string;
  quantity: number;
  safetyStock: number;
  coverageRatio: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
}

interface OpsResponse {
  demandForecast: string;
  inventoryRiskAlerts: InventoryRisk[];
}

export default function OperationsDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const client = useAuthorizedClient();
  const [ops, setOps] = useState<OpsResponse | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "OPERATIONS_HEAD" && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    async function load() {
      try {
        const res = await client.get<OpsResponse>("/dashboard/operations");
        setOps(res.data);
      } catch {
        // ignore
      }
    }
    load();
  }, [client]);

  if (!user) return null;

  const alerts = ops?.inventoryRiskAlerts ?? [];

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <div className="topbar-title">Operations · Demand & inventory</div>
          <div className="topbar-subtitle">
            Align production, inventory, and demand using unified telemetry.
          </div>
        </div>
        <div className="topbar-actions">
          <div className="pill">Role · Operations</div>
        </div>
      </div>

      <div className="cards-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Demand forecast</div>
          </div>
          <div className="card-metric">
            {ops?.demandForecast === "increasing"
              ? "↑ Increasing"
              : ops?.demandForecast === "decreasing"
              ? "↓ Decreasing"
              : "→ Stable"}
          </div>
          <div className="card-trend">
            Blend of bookings, revenue, and inventory signals.
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Inventory alerts</div>
          </div>
          <div className="card-metric metric-negative">{alerts.length}</div>
          <div className="card-trend">
            SKUs below safety stock threshold or near stockout.
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Optimization focus</div>
          </div>
          <div className="card-metric">Mix shift</div>
          <div className="card-trend">
            Reallocate capacity from slow movers into high-velocity SKUs.
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: "1.25rem" }}>
        <div className="panel-title">Inventory risk by SKU</div>
        <table className="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>On hand</th>
              <th>Safety stock</th>
              <th>Coverage</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.sku}>
                <td>{a.sku}</td>
                <td>{a.name}</td>
                <td>{a.quantity}</td>
                <td>{a.safetyStock}</td>
                <td>{a.coverageRatio.toFixed(2)}x</td>
                <td>{a.risk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

