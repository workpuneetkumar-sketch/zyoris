"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const { login, isLoading, error } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("Demo@zyoris.local");
  const [password, setPassword] = useState("Zyoris!");
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [company, setCompany] = useState("");
  const [companyAbout, setCompanyAbout] = useState("");
  const [businessType, setBusinessType] = useState("Technology / IT");
  const router = useRouter();

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch {
      // handled in context
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000"}/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password,
            designation,
            companyName: company,
            companyAbout,
            businessType,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Unable to register");
      }
      await login(email, password);
      router.push("/dashboard");
    } catch {
      // error surfaced via context if login fails; registration errors are generic
    }
  }

  const businessTypes = [
    "Technology / IT",
    "SaaS",
    "E-commerce",
    "Clothing & Apparel",
    "Consumer Goods",
    "Manufacturing",
    "Logistics & Supply Chain",
    "Financial Services",
    "Healthcare",
    "Pharmaceuticals",
    "Energy",
    "Retail",
    "Hospitality",
    "Real Estate",
    "Education",
    "Media & Entertainment",
    "Automotive",
    "Food & Beverage",
    "Telecommunications",
    "Consulting / Professional Services",
  ];

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div>
            <div className="login-title">Zyoris</div>
            <div className="login-subtitle">Central intelligence layer for modern operators.</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <button
            type="button"
            className="btn-secondary"
            style={{
              flex: 1,
              background: mode === "login" ? "rgba(37,99,235,0.4)" : "rgba(15,23,42,0.9)",
            }}
            onClick={() => setMode("login")}
          >
            Sign in
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{
              flex: 1,
              background: mode === "register" ? "rgba(37,99,235,0.4)" : "rgba(15,23,42,0.9)",
            }}
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin}>
            <div className="field-group">
              <label className="field-label">Work email</label>
              <input
                type="email"
                className="field-input"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="field-help">
                Demo login: <strong>Demo@zyoris.local</strong>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Password</label>
              <input
                type="password"
                className="field-input"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="field-help">Password: Zyoris!</div>
            </div>

            {error && (
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#f97316",
                  marginBottom: "0.5rem",
                }}
              >
                {error}
              </div>
            )}

            <button className="btn" type="submit" disabled={isLoading} style={{ width: "100%" }}>
              {isLoading ? "Signing in..." : "Sign in to workspace"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="field-group">
              <label className="field-label">Full name</label>
              <input
                type="text"
                className="field-input"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Work email</label>
              <input
                type="email"
                className="field-input"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Password</label>
              <input
                type="password"
                className="field-input"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Designation</label>
              <input
                type="text"
                className="field-input"
                placeholder="e.g. CEO, Head of Sales, FP&A Manager"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Company</label>
              <input
                type="text"
                className="field-input"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Company description</label>
              <textarea
                className="field-input"
                style={{ minHeight: "60px", resize: "vertical" }}
                value={companyAbout}
                onChange={(e) => setCompanyAbout(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Business type</label>
              <select
                className="field-select"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
              >
                {businessTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <button className="btn" type="submit" disabled={isLoading} style={{ width: "100%" }}>
              {isLoading ? "Creating workspace..." : "Register & enter workspace"}
            </button>
          </form>
        )}

        <div className="login-footer">
          <div>JWT-secured · Role-based access</div>
          <div>Data simulated for demo</div>
        </div>
      </div>
    </div>
  );
}

