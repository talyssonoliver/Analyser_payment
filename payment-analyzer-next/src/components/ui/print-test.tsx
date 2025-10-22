/**
 * Print Test Component
 * Demonstrates A4 print optimization with sample financial data
 */

"use client";

import { KPICard } from "@/components/ui/kpi-card";

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

export function PrintTestPage() {
  const handlePrint = () => {
    window.print();
  };

  const sampleData = {
    period: "Week 1-7 Jan 2024",
    generatedDate: new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    totals: {
      expected: 485.0,
      paid: 470.0,
      difference: -15.0,
      consignments: 145,
    },
    dailyEntries: [
      {
        date: "2024-01-01",
        day: "Monday",
        consignments: 25,
        rate: 2.0,
        basePay: 50.0,
        bonuses: { unloading: 30.0, attendance: 25.0, early: 50.0 },
        expected: 155.0,
        paid: 150.0,
        difference: -5.0,
        status: "underpaid" as const,
      },
      {
        date: "2024-01-02",
        day: "Tuesday",
        consignments: 30,
        rate: 2.0,
        basePay: 60.0,
        bonuses: { unloading: 30.0, attendance: 25.0, early: 50.0 },
        expected: 165.0,
        paid: 160.0,
        difference: -5.0,
        status: "underpaid" as const,
      },
      {
        date: "2024-01-06",
        day: "Saturday",
        consignments: 30,
        rate: 3.0,
        basePay: 90.0,
        bonuses: { unloading: 30.0, attendance: 0.0, early: 0.0 },
        expected: 120.0,
        paid: 120.0,
        difference: 0.0,
        status: "complete" as const,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Print Button - Hidden in print */}
      <div className="no-print mb-6 text-center">
        <button
          type="button"
          onClick={handlePrint}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
        >
          🖨️ Test Print A4 Layout
        </button>
        <p className="text-sm text-gray-600 mt-2">
          This page demonstrates the A4 print optimization. Click print to see the result.
        </p>
      </div>

      {/* Print Content - Optimized for A4 */}
      <div className="print-section">
        {/* Report Header */}
        <div className="report-header">
          <div className="report-title">PAYMENT ANALYSIS REPORT</div>
          <div className="report-subtitle">Financial Analysis & Settlement Summary</div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div>
              <div className="text-sm opacity-70 uppercase tracking-wide">Period</div>
              <div className="font-semibold">{sampleData.period}</div>
            </div>
            <div>
              <div className="text-sm opacity-70 uppercase tracking-wide">Generated</div>
              <div className="font-semibold">{sampleData.generatedDate}</div>
            </div>
            <div>
              <div className="text-sm opacity-70 uppercase tracking-wide">Total Days</div>
              <div className="font-semibold">{sampleData.dailyEntries.length}</div>
            </div>
            <div>
              <div className="text-sm opacity-70 uppercase tracking-wide">Status</div>
              <div className="font-semibold">Complete</div>
            </div>
          </div>
        </div>

        {/* KPI Section */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <KPICard
            label="Expected Total"
            value={formatCurrency(sampleData.totals.expected)}
            tone="info"
          />
          <KPICard
            label="Paid Amount"
            value={formatCurrency(sampleData.totals.paid)}
            tone="success"
          />
          <KPICard
            label="Difference"
            value={formatCurrency(sampleData.totals.difference)}
            tone={sampleData.totals.difference >= 0 ? "success" : "danger"}
            description={sampleData.totals.difference >= 0 ? "Overpaid" : "Underpaid"}
            trendDirection={
              sampleData.totals.difference > 0
                ? "up"
                : sampleData.totals.difference < 0
                  ? "down"
                  : "flat"
            }
            trend={`${Math.abs(sampleData.totals.difference).toFixed(2)} variance`}
          />
          <KPICard
            label="Consignments"
            value={sampleData.totals.consignments}
            description="Total deliveries"
            tone="primary"
          />
        </div>

        {/* Analysis Table */}
        <div className="avoid-break">
          <h2>Daily Analysis Breakdown</h2>
          <table className="analysis-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Consignments</th>
                <th>Rate</th>
                <th>Base Pay</th>
                <th>Bonuses</th>
                <th>Expected</th>
                <th>Paid</th>
                <th>Difference</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sampleData.dailyEntries.map((entry) => (
                <tr key={entry.date}>
                  <td>{entry.date}</td>
                  <td>{entry.day}</td>
                  <td>{entry.consignments}</td>
                  <td className="currency">£{entry.rate.toFixed(2)}</td>
                  <td className="currency">£{entry.basePay.toFixed(2)}</td>
                  <td className="currency">
                    £
                    {(
                      entry.bonuses.unloading +
                      entry.bonuses.attendance +
                      entry.bonuses.early
                    ).toFixed(2)}
                  </td>
                  <td className="currency">£{entry.expected.toFixed(2)}</td>
                  <td className="currency">£{entry.paid.toFixed(2)}</td>
                  <td className={`currency ${entry.difference >= 0 ? "positive" : "negative"}`}>
                    £{entry.difference.toFixed(2)}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        entry.status === "complete"
                          ? "status-complete"
                          : entry.status === "underpaid"
                            ? "status-error"
                            : "status-pending"
                      }`}
                    >
                      {entry.status === "complete"
                        ? "Complete"
                        : entry.status === "underpaid"
                          ? "Underpaid"
                          : "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>
                  <strong>Totals</strong>
                </td>
                <td>
                  <strong>{sampleData.totals.consignments}</strong>
                </td>
                <td>-</td>
                <td className="currency">
                  <strong>
                    £
                    {sampleData.dailyEntries
                      .reduce((sum, entry) => sum + entry.basePay, 0)
                      .toFixed(2)}
                  </strong>
                </td>
                <td className="currency">
                  <strong>
                    £
                    {sampleData.dailyEntries
                      .reduce(
                        (sum, entry) =>
                          sum +
                          entry.bonuses.unloading +
                          entry.bonuses.attendance +
                          entry.bonuses.early,
                        0
                      )
                      .toFixed(2)}
                  </strong>
                </td>
                <td className="currency">
                  <strong>£{sampleData.totals.expected.toFixed(2)}</strong>
                </td>
                <td className="currency">
                  <strong>£{sampleData.totals.paid.toFixed(2)}</strong>
                </td>
                <td
                  className={`currency ${sampleData.totals.difference >= 0 ? "positive" : "negative"}`}
                >
                  <strong>£{sampleData.totals.difference.toFixed(2)}</strong>
                </td>
                <td>-</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Summary Section */}
        <div className="summary-section page-break-after">
          <div className="summary-title">Settlement Summary</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KPICard
              label="Consignment Payments"
              value={formatCurrency(
                sampleData.dailyEntries.reduce((sum, entry) => sum + entry.basePay, 0)
              )}
              tone="info"
            />
            <KPICard
              label="Bonuses"
              value={formatCurrency(
                sampleData.dailyEntries.reduce(
                  (sum, entry) =>
                    sum + entry.bonuses.unloading + entry.bonuses.attendance + entry.bonuses.early,
                  0
                )
              )}
              tone="success"
            />
            <KPICard
              label="Total Expected"
              value={formatCurrency(sampleData.totals.expected)}
              tone="primary"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="print-footer">
          Generated by Payment Analyzer • {new Date().toLocaleDateString("en-GB")}
        </div>
      </div>
    </div>
  );
}
