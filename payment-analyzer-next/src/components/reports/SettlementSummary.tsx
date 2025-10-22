/**
 * Settlement Summary Component
 */

import type React from "react";

interface SettlementSummaryProps {
  breakdown: {
    consignments: number;
    pickups: number;
    unloading: number;
    attendance: number;
    early: number;
    total: number;
  };
  totals: {
    expected: number;
  };
}

export const SettlementSummary: React.FC<SettlementSummaryProps> = ({ breakdown, totals }) => {
  const items = [
    { label: "Consignment Payments", value: breakdown.consignments },
    { label: "Pickup Services", value: breakdown.pickups },
    { label: "Unloading Bonus", value: breakdown.unloading },
    { label: "Attendance Bonus", value: breakdown.attendance },
    { label: "Early Arrival Bonus", value: breakdown.early },
  ];

  return (
    <div
      className="settlement-breakdown"
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        borderRadius: "12px",
        padding: "24px",
        marginTop: "16px",
        border: "1px solid #e2e8f0",
      }}
    >
      <h3 className="breakdown-title text-lg font-bold text-slate-900 mb-5">Settlement Summary</h3>
      <div className="breakdown-grid space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="breakdown-item bg-white rounded-lg p-4 flex justify-between items-center hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200"
          >
            <span className="breakdown-label text-sm text-slate-600 font-medium">{item.label}</span>
            <span className="breakdown-value text-base font-bold font-mono text-slate-900">
              £{(item.value || 0).toFixed(2)}
            </span>
          </div>
        ))}

        <div className="breakdown-item breakdown-total bg-slate-900 text-white rounded-lg p-4 flex justify-between items-center hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
          <span className="breakdown-label text-sm font-bold text-white">Total Expected</span>
          <span className="breakdown-value text-base font-bold font-mono text-white">
            £{(totals.expected || 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};
