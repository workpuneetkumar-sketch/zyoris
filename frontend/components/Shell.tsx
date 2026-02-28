"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import classNames from "classnames";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"] },
  { href: "/dashboard/ceo", label: "CEO", roles: ["ADMIN", "CEO"] },
  { href: "/dashboard/cfo", label: "CFO", roles: ["ADMIN", "CFO"] },
  { href: "/dashboard/sales", label: "Sales", roles: ["ADMIN", "SALES_HEAD"] },
  { href: "/dashboard/operations", label: "Operations", roles: ["ADMIN", "OPERATIONS_HEAD"] },
  { href: "/profile", label: "My profile", roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"] }
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const displayName =
    user?.name && user.name.trim().length > 0
      ? user.name
      : user?.email?.split("@")[0] ?? "User";
  const initials = displayName
    .split(" ")
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);

  return (
    <div className={`app-shell role-${(user?.role ?? "DEFAULT").toLowerCase()}`}>
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">
            <span className="sidebar-logo-pill" />
            Zyoris
          </div>
          <div className="sidebar-section-title" style={{ marginTop: "1.2rem" }}>
            Central Intelligence
          </div>
          <nav className="sidebar-nav">
            {NAV_ITEMS.filter((item) =>
              user ? item.roles.includes(user.role) : item.href === "/dashboard"
            ).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={classNames("sidebar-link", {
                  "sidebar-link-active": pathname?.startsWith(item.href)
                })}
              >
                <span>{item.label}</span>
                <span style={{ fontSize: "0.7rem", color: "#6b7280" }}>›</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-footer-badge">v3 · Central Intelligence Layer</div>
          {user && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <div className="avatar">
                  <span>{initials}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.8rem" }}>{displayName}</span>
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                    {user.role.replace("_", " ")}
                  </span>
                </div>
              </div>
              <button
                className="btn-secondary"
                style={{ marginTop: "0.6rem", width: "100%" }}
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

