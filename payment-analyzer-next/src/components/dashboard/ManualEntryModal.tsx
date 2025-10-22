/**
 * ManualEntryModal Component
 * Prompt for adding manual entry on days without data
 */

"use client";

import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "@/styles/dashboard/modals.module.css";

interface ManualEntryModalProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onNavigate: (date: Date) => void;
}

export function ManualEntryModal({
  open,
  onClose,
  selectedDate,
  onNavigate,
}: Readonly<ManualEntryModalProps>) {
  if (!open || !selectedDate) return null;

  const handleAddData = () => {
    if (selectedDate) {
      onNavigate(selectedDate);
      onClose();
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.manualEntryModal}>
        <div className={styles.manualEntryHeader}>
          <h3 className={styles.manualEntryTitle}>Add Analysis Data</h3>
          <button type="button" onClick={onClose} className={styles.closeButton} aria-label="Close">
            <svg
              aria-hidden="true"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className={styles.manualEntryInfo}>
          <p className={styles.manualEntryInfoText}>
            <Calendar className="w-4 h-4 inline mr-1" />
            Selected Date: <strong>{selectedDate.toLocaleDateString()}</strong>
          </p>
        </div>

        <p className={styles.manualEntryDescription}>
          Ready to add analysis data for this date? You&apos;ll be taken to the analysis page where
          you can upload documents or enter data manually.
        </p>

        <div className={styles.manualEntryActions}>
          <Button onClick={handleAddData} className="flex-1 gap-2">
            <Plus className="w-4 h-4" />
            Go to Analysis
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
