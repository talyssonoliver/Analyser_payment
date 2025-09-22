/**
 * Analysis Entity
 * Represents a complete payment analysis with multiple daily entries
 */

import { DateRange } from '../value-objects/date-range';
import { DailyEntry } from './daily-entry';
import { Money } from '../value-objects/money';
import { ConsignmentCount } from '../value-objects/consignment-count';
import { AnalysisStatus, PaymentStatus } from '../../constants';
import { generateUUID } from '../../utils';

// Type alias to replace repeated union type
export type AnalysisSource = 'upload' | 'manual' | 'import';
export type DateLike = string | number | Date;

export interface AnalysisMetadata {
  fileCount?: number;
  originalFilenames?: string[];
  processingTime?: number;
  totalPagesProcessed?: number;
  consignmentPatterns?: string[];
  invoicePatterns?: string[];
  processingErrors?: string[];
  settings?: {
    autoCalculate?: boolean;
    includeWeekends?: boolean;
    customRules?: Record<string, unknown>;
  };
  [key: string]: unknown; // Allow additional properties
}

export class Analysis {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _fingerprint: string;
  private readonly _source: AnalysisSource;
  private _status: AnalysisStatus;
  private readonly _period: DateRange;
  private readonly _rulesVersion: number;
  private _dailyEntries: DailyEntry[];
  private _metadata: AnalysisMetadata;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(data: {
    id?: string;
    userId: string;
    fingerprint: string;
    source: AnalysisSource;
    status?: AnalysisStatus;
    periodStart: Date;
    periodEnd: Date;
    rulesVersion: number;
    dailyEntries?: DailyEntry[];
    metadata?: AnalysisMetadata;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this._id = data.id || generateUUID();
    this._userId = data.userId;
    this._fingerprint = data.fingerprint;
    this._source = data.source;
    this._status = data.status || 'pending';
    this._period = new DateRange(data.periodStart, data.periodEnd);
    this._rulesVersion = data.rulesVersion;
    this._dailyEntries = data.dailyEntries || [];
    this._metadata = data.metadata || {};
    this._createdAt = data.createdAt || new Date();
    this._updatedAt = data.updatedAt || new Date();
  }

  // Getters
  get id(): string { return this._id; }
  get userId(): string { return this._userId; }
  get fingerprint(): string { return this._fingerprint; }
  get source(): string { return this._source; }
  get status(): AnalysisStatus { return this._status; }
  get period(): DateRange { return this._period; }
  get rulesVersion(): number { return this._rulesVersion; }
  get dailyEntries(): ReadonlyArray<DailyEntry> { return [...this._dailyEntries]; }
  get metadata(): Readonly<AnalysisMetadata> { return { ...this._metadata }; }
  get createdAt(): Date { return new Date(this._createdAt); }
  get updatedAt(): Date { return new Date(this._updatedAt); }

  // Computed properties
  get workingDaysCount(): number {
    return this._dailyEntries.filter(entry => entry.isWorkingDay).length;
  }

  get totalConsignments(): ConsignmentCount {
    return this._dailyEntries.reduce(
      (total, entry) => total.add(entry.consignments),
      ConsignmentCount.zero()
    );
  }

  get baseTotal(): Money {
    return this._dailyEntries.reduce(
      (total, entry) => total.add(entry.basePayment),
      Money.zero()
    );
  }

  get bonusTotal(): Money {
    return this._dailyEntries.reduce(
      (total, entry) => total.add(entry.totalBonus),
      Money.zero()
    );
  }

  get pickupTotal(): Money {
    return this._dailyEntries.reduce(
      (total, entry) => total.add(entry.pickupTotal),
      Money.zero()
    );
  }

  get expectedTotal(): Money {
    return this._dailyEntries.reduce(
      (total, entry) => total.add(entry.expectedTotal),
      Money.zero()
    );
  }

  get paidTotal(): Money {
    return this._dailyEntries.reduce(
      (total, entry) => total.add(entry.paidAmount),
      Money.zero()
    );
  }

  get differenceTotal(): Money {
    return this.paidTotal.subtract(this.expectedTotal);
  }

  get overallStatus(): PaymentStatus {
    if (this.differenceTotal.isZero()) return 'balanced';
    return this.differenceTotal.isPositive() ? 'overpaid' : 'underpaid';
  }

  get periodFormatted(): string {
    return this._period.formatRange();
  }

  // Methods
  addDailyEntry(entry: DailyEntry): void {
    if (!this._period.contains(entry.date)) {
      throw new Error('Daily entry date is outside analysis period');
    }

    // Check if entry for this date already exists
    const existingIndex = this._dailyEntries.findIndex(
      e => e.date.toDateString() === entry.date.toDateString()
    );

    if (existingIndex >= 0) {
      this._dailyEntries[existingIndex] = entry;
    } else {
      this._dailyEntries.push(entry);
    }

    // Sort entries by date
    this._dailyEntries.sort((a, b) => a.date.getTime() - b.date.getTime());
    this.updateTimestamp();
  }

  removeDailyEntry(date: Date): void {
    this._dailyEntries = this._dailyEntries.filter(
      entry => entry.date.toDateString() !== date.toDateString()
    );
    this.updateTimestamp();
  }

  getDailyEntry(date: Date): DailyEntry | undefined {
    return this._dailyEntries.find(
      entry => entry.date.toDateString() === date.toDateString()
    );
  }

  updateStatus(status: AnalysisStatus): void {
    this._status = status;
    this.updateTimestamp();
  }

  updateMetadata(metadata: AnalysisMetadata): void {
    this._metadata = { ...this._metadata, ...metadata };
    this.updateTimestamp();
  }

  isComplete(): boolean {
    return this._status === 'completed' && this._dailyEntries.length > 0;
  }

  hasErrors(): boolean {
    return this._status === 'error';
  }

  private updateTimestamp(): void {
    this._updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this._id,
      userId: this._userId,
      fingerprint: this._fingerprint,
      source: this._source,
      status: this._status,
      periodStart: this._period.start.toISOString(),
      periodEnd: this._period.end.toISOString(),
      rulesVersion: this._rulesVersion,
      workingDays: this.workingDaysCount,
      totalConsignments: this.totalConsignments.count,
      dailyEntries: this._dailyEntries.map(entry => entry.toJSON()),
      totals: {
        baseTotal: this.baseTotal.amount,
        bonusTotal: this.bonusTotal.amount,
        pickupTotal: this.pickupTotal.amount,
        expectedTotal: this.expectedTotal.amount,
        paidTotal: this.paidTotal.amount,
        differenceTotal: this.differenceTotal.amount,
      },
      metadata: this._metadata,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  static fromJSON(data: Record<string, unknown>): Analysis {
    const analysis = new Analysis({
      id: data.id as string | undefined,
      userId: data.userId as string,
      fingerprint: data.fingerprint as string,
      source: data.source as AnalysisSource,
      status: data.status as AnalysisStatus | undefined,
      periodStart: new Date(data.periodStart as DateLike),
      periodEnd: new Date(data.periodEnd as DateLike),
      rulesVersion: data.rulesVersion as number,
      metadata: data.metadata as AnalysisMetadata | undefined,
      createdAt: new Date(data.createdAt as DateLike),
      updatedAt: new Date(data.updatedAt as DateLike),
    });

    // Add daily entries
    if (data.dailyEntries && Array.isArray(data.dailyEntries)) {
      data.dailyEntries.forEach((entryData: unknown) => {
        if (entryData && typeof entryData === 'object') {
          const entry = DailyEntry.fromJSON(entryData as Record<string, unknown>);
          analysis.addDailyEntry(entry);
        }
      });
    }

    return analysis;
  }
}