/**
 * Manual Entry Component
 * Allows manual input of daily payment data - matching original HTML
 */

'use client';

import { useEffect, useState } from 'react';
import { calculateExpectedPayment } from '@/lib/utils/payment-utils';
import { getDayName } from '@/lib/utils';
import { usePaymentTooltips } from '@/hooks/use-payment-tooltips';
import { InfoTooltip } from '@/components/ui/info-tooltip';

export interface ManualEntryData {
  id: string;
  date: Date;
  consignments: number;
  paidAmount: number;
  expectedAmount: number;
  difference: number;
  baseAmount?: number;
  pickups?: number;
  bonuses?: {
    early: number;
    attendance: number;
    unloading: number;
  };
}

export interface ManualEntryProps {
  onClose?: () => void;
  onAddEntry?: (entry: ManualEntryData) => void;
  editMode?: boolean;
  editData?: {
    date: Date;
    consignments: number;
    paidAmount: number;
    bonuses: {
      unloading: number;
      attendance: number;
      early: number;
    };
    pickups: number;
  };
}

export function ManualEntry({ onClose, onAddEntry, editMode = false, editData }: ManualEntryProps) {
  // State for dynamic tooltips
  const [selectedDate, setSelectedDate] = useState(editData?.date || new Date());
  const [consignments, setConsignments] = useState(editData?.consignments || 0);
  const tooltips = usePaymentTooltips(selectedDate, consignments);
  useEffect(() => {
    // Initialize calculation functionality using existing utilities
    const initializeCalculations = () => {
      // Calculate payments based on date and consignments
      const calculatePayments = () => {
        const dateInput = document.getElementById('entryDate') as HTMLInputElement;
        const dayInput = document.getElementById('entryDay') as HTMLInputElement;
        const consignmentsInput = document.getElementById('consignments') as HTMLInputElement;
        const baseAmountInput = document.getElementById('baseAmount') as HTMLInputElement;
        const earlyArriveInput = document.getElementById('earlyArrive') as HTMLInputElement;
        const attendanceInput = document.getElementById('onTimePercentage') as HTMLInputElement;
        const unloadingInput = document.getElementById('loadingBonus') as HTMLInputElement;
        const expectedTotalInput = document.getElementById('expectedTotal') as HTMLInputElement;

        if (!dateInput?.value) return;

        const date = new Date(dateInput.value);
        const consignments = parseInt(consignmentsInput?.value || '0') || 0;

        // Update day type using existing utility
        const dayName = getDayName(date);
        if (dayInput) dayInput.value = dayName;

        // Update state for tooltips
        setSelectedDate(date);
        setConsignments(consignments);

        // Use existing calculation utility
        const calculation = calculateExpectedPayment(date, consignments);

        // Update all form fields
        if (baseAmountInput) baseAmountInput.value = calculation.basePayment.toFixed(2);
        if (earlyArriveInput) earlyArriveInput.value = calculation.bonuses.early.toFixed(2);
        if (attendanceInput) attendanceInput.value = calculation.bonuses.attendance.toFixed(2);
        if (unloadingInput) unloadingInput.value = calculation.bonuses.unloading.toFixed(2);

        // Calculate expected total from current bonus values
        const calculateExpectedTotal = () => {
          const baseAmount = parseFloat(baseAmountInput?.value || '0');
          const earlyBonus = parseFloat(earlyArriveInput?.value || '0');
          const attendanceBonus = parseFloat(attendanceInput?.value || '0');
          const unloadingBonus = parseFloat(unloadingInput?.value || '0');

          const total = baseAmount + earlyBonus + attendanceBonus + unloadingBonus;
          if (expectedTotalInput) expectedTotalInput.value = total.toFixed(2);
        };

        calculateExpectedTotal();
      };

      const calculateExpectedTotal = () => {
        const baseAmountInput = document.getElementById('baseAmount') as HTMLInputElement;
        const earlyArriveInput = document.getElementById('earlyArrive') as HTMLInputElement;
        const attendanceInput = document.getElementById('onTimePercentage') as HTMLInputElement;
        const unloadingInput = document.getElementById('loadingBonus') as HTMLInputElement;
        const expectedTotalInput = document.getElementById('expectedTotal') as HTMLInputElement;

        const baseAmount = parseFloat(baseAmountInput?.value || '0');
        const earlyBonus = parseFloat(earlyArriveInput?.value || '0');
        const attendanceBonus = parseFloat(attendanceInput?.value || '0');
        const unloadingBonus = parseFloat(unloadingInput?.value || '0');

        const total = baseAmount + earlyBonus + attendanceBonus + unloadingBonus;
        if (expectedTotalInput) expectedTotalInput.value = total.toFixed(2);
      };

      // Set up event listeners
      const dateInput = document.getElementById('entryDate');
      const consignmentsInput = document.getElementById('consignments');
      const earlyArriveInput = document.getElementById('earlyArrive');
      const attendanceInput = document.getElementById('onTimePercentage');
      const unloadingInput = document.getElementById('loadingBonus');

      if (dateInput) {
        dateInput.addEventListener('change', calculatePayments);
      }
      if (consignmentsInput) {
        consignmentsInput.addEventListener('input', calculatePayments);
      }
      if (earlyArriveInput) {
        earlyArriveInput.addEventListener('input', calculateExpectedTotal);
      }
      if (attendanceInput) {
        attendanceInput.addEventListener('input', calculateExpectedTotal);
      }
      if (unloadingInput) {
        unloadingInput.addEventListener('input', calculateExpectedTotal);
      }

      // Initialize with current values
      setTimeout(calculatePayments, 100);

      // Cleanup function
      return () => {
        if (dateInput) dateInput.removeEventListener('change', calculatePayments);
        if (consignmentsInput) consignmentsInput.removeEventListener('input', calculatePayments);
        if (earlyArriveInput) earlyArriveInput.removeEventListener('input', calculateExpectedTotal);
        if (attendanceInput) attendanceInput.removeEventListener('input', calculateExpectedTotal);
        if (unloadingInput) unloadingInput.removeEventListener('input', calculateExpectedTotal);
      };
    };

    const cleanup = initializeCalculations();
    return cleanup;
  }, []);

  return (
    <>
      {/* Modal Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
            </svg>
          </div>
          <h3 id="modal-title" className="text-xl font-semibold text-slate-900">
            {editMode ? 'Edit Day Data' : 'Manual Data Entry'}
          </h3>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Modal Body */}
      <div className="p-6 max-h-[70vh] overflow-y-auto">
        <form className="space-y-8">
          {/* Date Information */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-slate-900">Date Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="entryDate" className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                <input
                  id="entryDate"
                  type="date"
                  className={`modal-input w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${editMode ? 'bg-slate-50' : ''}`}
                  defaultValue={editData?.date ? editData.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                  readOnly={editMode}
                />
              </div>
              <div>
                <label htmlFor="entryDay" className="block text-sm font-medium text-slate-700 mb-2">Day Type</label>
                <input
                  id="entryDay"
                  type="text"
                  className="modal-input w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  readOnly
                  defaultValue={editData?.date ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][editData.date.getDay()] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]}
                />
                <p className="text-xs text-slate-500 mt-1">Automatically calculated from date</p>
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-slate-900">Delivery Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="consignments" className="block text-sm font-medium text-slate-700 mb-2">Consignments</label>
                <input
                  id="consignments"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  defaultValue={editData?.consignments || 0}
                  className="modal-input w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="baseAmount" className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
                  Base Amount (£)
                  <InfoTooltip content={tooltips.baseAmount} />
                </label>
                <input
                  id="baseAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="modal-input w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  readOnly
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pickups" className="block text-sm font-medium text-slate-700 mb-2">Pickups</label>
                <input
                  id="pickups"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  defaultValue={editData?.pickups || 0}
                  className="modal-input w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Bonus Information */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-slate-900">Bonus Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="earlyArrive" className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
                  Early Arrive (£)
                  <InfoTooltip content={tooltips.earlyArrive} />
                </label>
                <input
                  id="earlyArrive"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue={editData?.bonuses?.early || 0}
                  className="modal-input w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="onTimePercentage" className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
                  Attendance Bonus (£)
                  <InfoTooltip content={tooltips.attendance} />
                </label>
                <input
                  id="onTimePercentage"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue={editData?.bonuses?.attendance || 0}
                  className="modal-input w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="loadingBonus" className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
                  Unloading Bonus (£)
                  <InfoTooltip content={tooltips.unloading} />
                </label>
                <input
                  id="loadingBonus"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue={editData?.bonuses?.unloading || 0}
                  className="modal-input w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

          </div>

          {/* Payment Information */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-slate-900">Payment Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="expectedTotal" className="block text-sm font-medium text-slate-700 mb-2">
                  Expected Total (£)
                </label>
                <input
                  id="expectedTotal"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="modal-input w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-semibold text-green-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  readOnly
                />
              </div>
              <div>
                <label htmlFor="paidAmount" className="block text-sm font-medium text-slate-700 mb-2">
                  Paid Amount (£)
                </label>
                <input
                  id="paidAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue={editData?.paidAmount || 0}
                  className="modal-input w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Modal Footer */}
      <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 sticky bottom-0 z-10">
        <button 
          onClick={onClose}
          className="px-6 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (onAddEntry) {
              // Get form values
              const dateInput = document.getElementById('entryDate') as HTMLInputElement;
              const consignmentsInput = document.getElementById('consignments') as HTMLInputElement;
              const pickupsInput = document.getElementById('pickups') as HTMLInputElement;
              const paidAmountInput = document.getElementById('paidAmount') as HTMLInputElement;
              const baseAmountInput = document.getElementById('baseAmount') as HTMLInputElement;
              const earlyArriveInput = document.getElementById('earlyArrive') as HTMLInputElement;
              const attendanceInput = document.getElementById('onTimePercentage') as HTMLInputElement;
              const unloadingInput = document.getElementById('loadingBonus') as HTMLInputElement;
              const expectedTotalInput = document.getElementById('expectedTotal') as HTMLInputElement;

              const entryData: ManualEntryData = {
                id: editMode ? editData?.date?.toISOString().split('T')[0] || Date.now().toString() : Date.now().toString(),
                date: new Date(dateInput?.value || new Date()),
                consignments: parseInt(consignmentsInput?.value || '0') || 0,
                paidAmount: parseFloat(paidAmountInput?.value || '0') || 0,
                expectedAmount: parseFloat(expectedTotalInput?.value || '0') || 0,
                difference: 0, // Will be calculated by the save function
                // Add additional data for edit mode
                ...(editMode && {
                  baseAmount: parseFloat(baseAmountInput?.value || '0') || 0,
                  pickups: parseInt(pickupsInput?.value || '0') || 0,
                  bonuses: {
                    early: parseFloat(earlyArriveInput?.value || '0') || 0,
                    attendance: parseFloat(attendanceInput?.value || '0') || 0,
                    unloading: parseFloat(unloadingInput?.value || '0') || 0,
                  }
                })
              };
              onAddEntry(entryData);
            }
          }}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          {editMode ? 'Update Entry' : 'Add Entry'}
        </button>
      </div>
    </>
  );
}