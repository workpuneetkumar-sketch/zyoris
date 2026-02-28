"use client";

export interface DataSenseReportData {
  datasetType: string;
  section1_datasetOverview: string;
  section2_performanceAnalysis: string;
  section3_issuesWeaknesses: string;
  section4_dataQualityAssessment: string;
  section5_improvementRecommendations: string;
  section6_riskAssessment: string;
  section7_executiveSummary: string;
}

const SECTIONS: { key: keyof DataSenseReportData; title: string }[] = [
  { key: "section1_datasetOverview", title: "📊 Dataset Overview" },
  { key: "section2_performanceAnalysis", title: "📈 Performance Analysis" },
  { key: "section3_issuesWeaknesses", title: "⚠ Issues & Weaknesses" },
  { key: "section4_dataQualityAssessment", title: "🧹 Data Quality Assessment" },
  { key: "section5_improvementRecommendations", title: "🚀 Improvement Recommendations" },
  { key: "section6_riskAssessment", title: "🔎 Risk Assessment" },
  { key: "section7_executiveSummary", title: "📌 Executive Summary" },
];

export function DataSenseReport({ report }: { report: DataSenseReportData }) {
  return (
    <div
      className="datasense-report"
      style={{
        marginTop: "2rem",
        padding: "1.5rem",
        background: "linear-gradient(145deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)",
        borderRadius: "12px",
        border: "1px solid rgba(71, 85, 105, 0.5)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "1.5rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid rgba(71, 85, 105, 0.5)",
        }}
      >
        <span style={{ fontSize: "1.5rem" }}>🧠</span>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "1.25rem",
              fontWeight: 600,
              color: "#f1f5f9",
            }}
          >
            DataSense AI – Intelligent Performance Analyst
          </h2>
          <p
            style={{
              margin: "0.25rem 0 0",
              fontSize: "0.8rem",
              color: "#94a3b8",
            }}
          >
            Senior business analyst report · Dataset type: {report.datasetType.replace("_", " ")}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {SECTIONS.map(({ key, title }) => {
          const content = report[key];
          if (typeof content !== "string" || !content) return null;
          return (
            <section key={key}>
              <h3
                style={{
                  margin: "0 0 0.5rem",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  color: "#e2e8f0",
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.9rem",
                  lineHeight: 1.65,
                  color: "#cbd5e1",
                }}
              >
                {content}
              </p>
            </section>
          );
        })}
      </div>
    </div>
  );
}
