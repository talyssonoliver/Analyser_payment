/**
 * Report Header Component
 */

import type React from "react";

interface ReportHeaderProps {
  reportType: string;
  period: string;
  generatedDate: string;
  totalDays: number;
  status: string;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  reportType,
  period,
  generatedDate,
  totalDays,
  status,
}) => {
  return (
    <div
      className="report-header enhanced-header"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "white",
        padding: "16px 24px",
        borderRadius: "16px",
        marginBottom: "8px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div className="report-header-content" style={{ position: "relative", zIndex: 1 }}>
        <div
          className="report-company"
          style={{
            fontSize: "1.5rem",
            fontWeight: "800",
            marginBottom: "8px",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          FINANCIAL ANALYSIS
        </div>

        <div
          className="report-title"
          style={{
            fontSize: "1rem",
            fontWeight: "400",
            opacity: "0.9",
            marginBottom: "24px",
          }}
        >
          {reportType}
        </div>

        <div
          className="report-meta"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "16px",
          }}
        >
          <MetaItem label="Period" value={period} />
          <MetaItem label="Generated" value={generatedDate} />
          <MetaItem label="Total Days" value={totalDays.toString()} />
          <MetaItem label="Status" value={status} />
        </div>
      </div>
    </div>
  );
};

const MetaItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="report-meta-item">
    <div
      className="report-meta-label"
      style={{
        fontSize: "0.75rem",
        opacity: "0.7",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      {label}
    </div>
    <div
      className="report-meta-value"
      style={{
        fontSize: "1rem",
        fontWeight: "600",
      }}
    >
      {value}
    </div>
  </div>
);
