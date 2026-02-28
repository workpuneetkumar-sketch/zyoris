"use client";

import { useState, DragEvent, ChangeEvent } from "react";
import { useAuthorizedClient } from "../context/AuthContext";
import type { UploadAnalysisData } from "./UploadAnalysisSection";

type Status = "idle" | "uploading" | "success" | "error";

type UploadPanelProps = {
  onAnalysis?: (analysis: UploadAnalysisData) => void;
};

export function UploadPanel({ onAnalysis }: UploadPanelProps) {
  const client = useAuthorizedClient();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  async function uploadSelectedFile(selected: File | null) {
    if (!selected) {
      setMessage("Please select a CSV or Excel file first.");
      setStatus("error");
      return;
    }
    setStatus("uploading");
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", selected);
      const res = await client.post("/ingestion/upload", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setStatus("success");
      const rows = res.data.rowsIngested ?? res.data.rows ?? 0;
      setMessage(
        rows > 0
          ? `Ingested ${rows} rows from ${selected.name}. Analysis and charts are below.`
          : `Processed ${selected.name}. Analysis and charts are below.`
      );
      if (res.data.analysis && onAnalysis) onAnalysis(res.data.analysis as UploadAnalysisData);
    } catch (e: any) {
      setStatus("error");
      setMessage(e?.response?.data?.error ?? "Upload failed. Please check file format.");
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const list = e.dataTransfer.files;
    if (!list || list.length === 0) return;
    setFile(list[0]);
    setStatus("idle");
    setMessage(`Ready to upload: ${list[0].name}`);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    setFile(list[0]);
    setStatus("idle");
    setMessage(`Ready to upload: ${list[0].name}`);
  }

  return (
    <div className="panel" style={{ marginTop: "1.25rem" }}>
      <div className="panel-title">Upload CSV / Excel data</div>
      <div
        className="upload-dropzone"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <input
          type="file"
          accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={onChange}
          className="upload-input"
        />
        <div className="upload-instructions">
          <div className="upload-title">Drag &amp; drop file here</div>
          <div className="upload-subtitle">
            or click to browse. Supports CSV and Excel exports from your CRM, ERP, or finance
            systems.
          </div>
          <div className="upload-hint">
            Zyoris will ingest recognizable columns into revenue, deals, expenses, marketing, or
            inventory tables.
          </div>
        </div>
      </div>
      <button
        className="btn-secondary"
        type="button"
        style={{ marginTop: "0.75rem" }}
        onClick={() => uploadSelectedFile(file)}
      >
        Upload file
      </button>
      {status !== "idle" && (
        <div
          style={{
            marginTop: "0.75rem",
            fontSize: "0.8rem",
            color: status === "error" ? "#f97316" : "#9ca3af"
          }}
        >
          {status === "uploading" && "Uploading and ingesting data..."}
          {status !== "uploading" && message}
        </div>
      )}
    </div>
  );
}

