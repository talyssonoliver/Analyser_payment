/**
 * Report Table Component
 */

import { Edit2 } from "lucide-react";
import type React from "react";
import { Card } from "@/components/ui";
import type { DailyEntry } from "./ReportDataConverter";

interface ReportTableProps {
  dailyEntries: DailyEntry[];
  totals: {
    consignments: number;
    basePay: number;
    pickups: number;
    bonuses: number;
    expected: number;
    paid: number;
    difference: number;
  };
  compactView: boolean;
  viewMode: "week" | "month";
  onToggleCompactView: () => void;
  onEditDayData: (entry: DailyEntry) => void;
}

export const ReportTable: React.FC<ReportTableProps> = ({
  dailyEntries,
  totals,
  compactView,
  viewMode,
  onToggleCompactView,
  onEditDayData,
}) => {
  const getStatusBadge = (status: DailyEntry["status"]) => {
    const styles = {
      complete: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      overpaid: "bg-blue-100 text-blue-800",
      underpaid: "bg-red-100 text-red-800",
      balanced: "bg-green-100 text-green-800",
    };

    const labels = {
      complete: "Complete",
      pending: "Pending",
      overpaid: "Overpaid",
      underpaid: "Underpaid",
      balanced: "Balanced",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.complete}`}
      >
        {labels[status] || status}
      </span>
    );
  };

  const groupDailyEntries = (entries: DailyEntry[]) => {
    if (viewMode === "week") {
      return entries;
    }

    const monthGroups: { [key: string]: DailyEntry[] } = {};

    entries.forEach((entry) => {
      const date = new Date(entry.date);
      const monthKey = date.toISOString().slice(0, 7);

      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = [];
      }
      monthGroups[monthKey].push(entry);
    });

    return Object.entries(monthGroups)
      .map(([monthKey, monthEntries]) => {
        const totalConsignments = monthEntries.reduce((sum, entry) => sum + entry.consignments, 0);
        const totalBasePay = monthEntries.reduce((sum, entry) => sum + entry.basePay, 0);
        const totalPickupTotal = monthEntries.reduce((sum, entry) => sum + entry.pickupTotal, 0);
        const totalExpected = monthEntries.reduce((sum, entry) => sum + entry.expected, 0);
        const totalPaid = monthEntries.reduce((sum, entry) => sum + entry.paid, 0);
        const totalDifference = monthEntries.reduce((sum, entry) => sum + entry.difference, 0);

        const date = new Date(`${monthKey}-01`);
        const monthName = date.toLocaleDateString("en-GB", { year: "numeric", month: "long" });

        return {
          date: monthKey,
          day: monthName,
          consignments: totalConsignments,
          rate: 0,
          basePay: totalBasePay,
          pickups: monthEntries.reduce((sum, entry) => sum + entry.pickups, 0),
          pickupTotal: totalPickupTotal,
          bonuses: {
            unloading: monthEntries.reduce((sum, entry) => sum + entry.bonuses.unloading, 0),
            attendance: monthEntries.reduce((sum, entry) => sum + entry.bonuses.attendance, 0),
            early: monthEntries.reduce((sum, entry) => sum + entry.bonuses.early, 0),
          },
          expected: totalExpected,
          paid: totalPaid,
          difference: totalDifference,
          status: (totalDifference >= 0 ? "complete" : "underpaid") as DailyEntry["status"],
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  return (
    <Card variant="secondary" className="overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">
            {viewMode === "week" ? "Daily Analysis Breakdown" : "Monthly Analysis Summary"}
          </h3>
          <button
            type="button"
            onClick={onToggleCompactView}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {compactView ? "Detailed View" : "Compact View"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className={`w-full analysis-table ${compactView ? "compact-view" : ""}`}>
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                {viewMode === "week" ? "Date" : "Month"}
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                {viewMode === "week" ? "Day" : "Period"}
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Consignments
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                {viewMode === "week" ? "Rate" : "Avg Rate"}
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Base Pay
              </th>
              {!compactView && (
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Pickups
                </th>
              )}
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Bonuses
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Expected
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Paid
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Difference
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {groupDailyEntries(dailyEntries).map((entry) => (
              <tr key={entry.date} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm font-mono text-slate-900">{entry.date}</td>
                <td className="px-6 py-4 text-sm text-slate-700">{entry.day}</td>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">
                  {entry.consignments}
                </td>
                <td className="px-6 py-4 text-sm font-mono text-slate-700">
                  {viewMode === "week" ? `£${(entry.rate || 0).toFixed(2)}` : "N/A"}
                </td>
                <td className="px-6 py-4 text-sm font-mono text-slate-900 currency">
                  £{(entry.basePay || 0).toFixed(2)}
                </td>
                {!compactView && (
                  <td className="px-6 py-4 text-sm font-mono text-slate-700 currency">
                    £{(entry.pickupTotal || 0).toFixed(2)}
                  </td>
                )}
                <td className="px-6 py-4 text-sm font-mono text-slate-700 currency">
                  £
                  {(
                    (entry.bonuses.unloading || 0) +
                    (entry.bonuses.attendance || 0) +
                    (entry.bonuses.early || 0)
                  ).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm font-mono font-semibold text-slate-900 currency">
                  £{(entry.expected || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm font-mono text-slate-900 currency">
                  £{(entry.paid || 0).toFixed(2)}
                </td>
                <td
                  className={`px-6 py-4 text-sm font-mono font-medium currency ${entry.difference >= 0 ? "text-green-600 positive" : "text-red-600 negative"}`}
                >
                  £{(entry.difference || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm">{getStatusBadge(entry.status)}</td>
                <td className="px-6 py-4 text-center">
                  <button
                    type="button"
                    onClick={() => onEditDayData(entry)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Edit day data"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50">
            <tr>
              <td className="px-6 py-4 text-sm font-bold text-slate-900" colSpan={2}>
                Totals
              </td>
              <td className="px-6 py-4 text-sm font-bold text-slate-900">{totals.consignments}</td>
              <td className="px-6 py-4 text-sm text-slate-500">-</td>
              <td className="px-6 py-4 text-sm font-bold font-mono text-slate-900 currency">
                £{(totals.basePay || 0).toFixed(2)}
              </td>
              {!compactView && (
                <td className="px-6 py-4 text-sm font-bold font-mono text-slate-900 currency">
                  £{(totals.pickups || 0).toFixed(2)}
                </td>
              )}
              <td className="px-6 py-4 text-sm font-bold font-mono text-slate-900 currency">
                £{(totals.bonuses || 0).toFixed(2)}
              </td>
              <td className="px-6 py-4 text-sm font-bold font-mono text-slate-900 currency">
                £{(totals.expected || 0).toFixed(2)}
              </td>
              <td className="px-6 py-4 text-sm font-bold font-mono text-slate-900 currency">
                £{(totals.paid || 0).toFixed(2)}
              </td>
              <td
                className={`px-6 py-4 text-sm font-bold font-mono currency ${totals.difference >= 0 ? "text-green-600 positive" : "text-red-600 negative"}`}
              >
                £{(totals.difference || 0).toFixed(2)}
              </td>
              <td className="px-6 py-4 text-sm text-slate-500">-</td>
              <td className="px-6 py-4 text-sm text-slate-500">-</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
};
