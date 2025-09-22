/**
 * Payment Analyzer Business Constants
 * Extracted from the original system to preserve exact business logic
 */

// Payment Rates (from original system)
export const DEFAULT_PAYMENT_RULES = {
  weekdayRate: 2.00,        // £2.00 per consignment Monday-Friday
  saturdayRate: 3.00,       // £3.00 per consignment Saturday
  unloadingBonus: 30.00,    // £30.00 per day (except Mondays)
  attendanceBonus: 25.00,   // £25.00 per day (weekdays only)
  earlyBonus: 50.00,        // £50.00 per day (weekdays only)
} as const;

// Analysis Constants
export const ANALYSIS_LIMITS = {
  maxFileSize: 50 * 1024 * 1024, // 50MB per file
  maxFiles: 50,                   // Maximum files per upload
  maxAnalyses: 50,               // Maximum stored analyses
} as const;

// PDF Processing
export const PDF_CONFIG = {
  allowedTypes: ['application/pdf'],
  invoicePatterns: {
    dateTime: /(\d{2}\/\d{2}\/\d{2})\s+(\d{2}:\d{2})/g,
    amount: /£(\d{1,3}(?:,\d{3})*\.?\d{0,2})/g,
    minAmount: 3.00,
    maxAmount: 500.00,
  },
  runsheetPatterns: {
    date: /Date:\s*(\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4})/i,
    consignment: /\b\d{7}\b|\bAH\d+\b/g,
  },
} as const;

// Local Storage Keys (matching original system)
export const STORAGE_KEYS = {
  analysisData: 'analysis-data',
  manualEntries: 'manual-entries',
  currentState: 'payment-analyzer-state',
  settings: 'payment-analyzer-settings',
} as const;

// Status Types
export type PaymentStatus = 'balanced' | 'overpaid' | 'underpaid';
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'error';
export type FileType = 'runsheet' | 'invoice' | 'other';

// Days of Week
export const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
] as const;

// Bonus Application Rules (from original system)
export const BONUS_RULES = {
  unloading: {
    // Applies to all working days EXCEPT Mondays and Sundays
    excludeDays: [0, 1], // Sunday, Monday
  },
  attendance: {
    // Applies to weekdays only (Monday-Friday)
    includeDays: [1, 2, 3, 4, 5], // Monday to Friday
  },
  early: {
    // Applies to weekdays only (Monday-Friday)  
    includeDays: [1, 2, 3, 4, 5], // Monday to Friday
  },
} as const;