/**
 * Day Data Modal Component
 * Shows detailed information for calendar days with analysis data
 */

'use client';

import React from 'react';
import { X, Edit2 } from 'lucide-react';

interface DayData {
  date: string;
  analysisId: string;
  analysisName: string;
  data: {
    consignments: number;
    expectedTotal: number;
    paidAmount: number;
    difference: number;
    status: string;
  };
}

interface DayDataModalProps {
  date: Date;
  dayData: DayData[];
  isOpen: boolean;
  onClose: () => void;
  onEditDay?: (analysisId: string, date: string) => void;
}

export function DayDataModal({ 
  date, 
  dayData, 
  isOpen, 
  onClose, 
  onEditDay 
}: DayDataModalProps) {
  if (!isOpen) return null;

  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;

  const getStatusColor = (status: string, difference: number) => {
    if (difference > 0) return '#22c55e'; // green for overpaid
    if (difference < 0) return '#ef4444'; // red for underpaid
    return '#3b82f6'; // blue for balanced
  };

  const getStatusText = (difference: number) => {
    if (difference > 0) return 'Overpaid';
    if (difference < 0) return 'Underpaid';
    return 'Balanced';
  };

  return (
    <div 
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content">
        {/* Modal Header */}
        <div className="modal-header">
          <h3 className="modal-title">
            Data for {date.toLocaleDateString('en-GB', { 
              weekday: 'long',
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </h3>
          <button 
            className="modal-close-btn"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {dayData.map((item, index) => (
            <div key={`${item.analysisId}-${index}`} className="day-data-card">
              <div className="card-header">
                <div className="analysis-name">{item.analysisName}</div>
                <button
                  className="edit-btn"
                  onClick={() => onEditDay?.(item.analysisId, item.date)}
                  title="Edit this analysis"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="data-grid">
                <div className="data-item">
                  <span className="data-label">Consignments:</span>
                  <span className="data-value">{item.data.consignments}</span>
                </div>
                <div className="data-item">
                  <span className="data-label">Expected:</span>
                  <span className="data-value expected">
                    {formatCurrency(item.data.expectedTotal)}
                  </span>
                </div>
                <div className="data-item">
                  <span className="data-label">Paid:</span>
                  <span className="data-value paid">
                    {formatCurrency(item.data.paidAmount)}
                  </span>
                </div>
                <div className="data-item">
                  <span className="data-label">Difference:</span>
                  <span 
                    className="data-value difference"
                    style={{ color: getStatusColor(item.data.status, item.data.difference) }}
                  >
                    {formatCurrency(item.data.difference)}
                  </span>
                </div>
              </div>

              <div className="status-badge">
                <span 
                  className="status-indicator"
                  style={{ backgroundColor: getStatusColor(item.data.status, item.data.difference) }}
                />
                {getStatusText(item.data.difference)}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          backdrop-filter: blur(4px);
          padding: 16px;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          max-width: 500px;
          width: 100%;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-title {
          margin: 0;
          color: #1e293b;
          font-size: 18px;
          font-weight: 600;
        }

        .modal-close-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .modal-close-btn:hover {
          background: #f1f5f9;
          color: #1e293b;
        }

        .modal-body {
          padding: 20px 24px;
          max-height: 50vh;
          overflow-y: auto;
        }

        .day-data-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
          background: #f8fafc;
          transition: all 0.2s ease;
        }

        .day-data-card:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .analysis-name {
          font-weight: 600;
          color: #1e293b;
          font-size: 14px;
        }

        .edit-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 6px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .edit-btn:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .data-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 12px;
        }

        .data-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }

        .data-label {
          color: #64748b;
          font-weight: 500;
        }

        .data-value {
          font-weight: 600;
        }

        .data-value.expected {
          color: #3b82f6;
        }

        .data-value.paid {
          color: #1e293b;
        }

        .data-value.difference {
          font-weight: 700;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .modal-footer {
          padding: 20px 24px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
        }

        .close-btn {
          background: #e2e8f0;
          color: #475569;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: #cbd5e1;
        }

        @media (max-width: 640px) {
          .modal-content {
            margin: 16px;
            max-height: calc(100vh - 32px);
          }

          .modal-header {
            padding: 16px 20px;
          }

          .modal-title {
            font-size: 16px;
          }

          .modal-body {
            padding: 16px 20px;
          }

          .modal-footer {
            padding: 16px 20px;
          }

          .data-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
}