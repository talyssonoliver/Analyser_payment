/**
 * Step 3 Summary Cards Component
 * Pure React component replacing HTML string generation from step3-content-generator.ts lines 63-158
 */

import { ReportKPIGrid } from "@/components/reports/shared";
import type { ManualEntry } from "@/types/core";
import type { AnalysisData } from "./types";

interface Step3SummaryCardsProps {
  readonly analysisData: AnalysisData | null;
  readonly manualEntries: ManualEntry[];
  readonly currentInputMethod: "upload" | "manual";
}

export function Step3SummaryCards({
  analysisData,
  manualEntries,
  currentInputMethod,
}: Readonly<Step3SummaryCardsProps>) {
  // If we have analysis results from file upload, use those
  if (analysisData?.totals) {
    const totals = analysisData.totals;
    const difference = (totals.paidTotal || 0) - (totals.expectedTotal || 0);

    return (
      <>
        <h3 className="summary-title">Quick Summary</h3>
        <ReportKPIGrid
          data={{
            expected: totals.expectedTotal || 0,
            paid: totals.paidTotal || 0,
            difference: difference,
            consignments: totals.totalConsignments || 0,
          }}
          variant="full"
          columns={4}
        />
      </>
    );
  }

  // Fall back to manual entries if no analysis data
  if (currentInputMethod === "manual" && manualEntries.length > 0) {
    const totalConsignments = manualEntries.reduce((sum, entry) => sum + entry.consignments, 0);
    const totalExpected = manualEntries.reduce((sum, entry) => sum + (entry.expectedTotal || 0), 0);

    return (
      <>
        <h3 className="summary-title">Quick Summary</h3>
        <ReportKPIGrid
          data={{
            expected: totalExpected,
            paid: totalExpected,
            difference: 0,
            consignments: totalConsignments,
          }}
          variant="full"
          columns={4}
        />
      </>
    );
  }

  return (
    <>
      <h3 className="summary-title">Quick Summary</h3>
      <div className="summary-cards">
        <div className="summary-card-simple">
          <div className="card-value">-</div>
          <div className="card-label">No Data</div>
        </div>
      </div>
    </>
  );
}
