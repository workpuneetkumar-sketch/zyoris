import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { AuthProvider } from "../context/AuthContext";
import { ZiiBot } from "../components/ZiiBot";

export const metadata: Metadata = {
  title: "Zyoris - Central Intelligence Layer",
  description: "Autonomous Business Intelligence Platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="light">
      <body>
        <AuthProvider>
          {children}
          <ZiiBot />
        </AuthProvider>
      </body>
    </html>
  );
}

