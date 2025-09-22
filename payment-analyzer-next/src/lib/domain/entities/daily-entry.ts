/**
 * DailyEntry Entity
 * Represents a single day's payment analysis data
 */

import { Money } from '../value-objects/money';
import { ConsignmentCount } from '../value-objects/consignment-count';
import { PaymentStatus } from '../../constants';
import { format } from 'date-fns';
import { generateUUID } from '../../utils';

export class DailyEntry {
  private readonly _id: string;
  private readonly _analysisId: string;
  private readonly _date: Date;
  private readonly _dayOfWeek: number;
  private readonly _consignments: ConsignmentCount;
  private readonly _rate: Money;
  private readonly _basePayment: Money;
  private _pickups: ConsignmentCount;
  private _pickupTotal: Money;
  private readonly _unloadingBonus: Money;
  private readonly _attendanceBonus: Money;
  private readonly _earlyBonus: Money;
  private _expectedTotal: Money;
  private _paidAmount: Money;
  private _difference: Money;

  constructor(data: {
    id?: string;
    analysisId: string;
    date: Date;
    consignments: number;
    rate: number;
    basePayment?: number;
    pickups?: number;
    pickupTotal?: number;
    unloadingBonus?: number;
    attendanceBonus?: number;
    earlyBonus?: number;
    paidAmount: number;
  }) {
    this._id = data.id || generateUUID();
    this._analysisId = data.analysisId;
    this._date = new Date(data.date);
    this._dayOfWeek = this._date.getDay();
    this._consignments = ConsignmentCount.from(data.consignments);
    this._rate = Money.from(data.rate);
    this._basePayment = Money.from(data.basePayment ?? (data.consignments * data.rate));
    this._pickups = ConsignmentCount.from(data.pickups ?? 0);
    this._pickupTotal = Money.from(data.pickupTotal ?? 0);
    this._unloadingBonus = Money.from(data.unloadingBonus ?? 0);
    this._attendanceBonus = Money.from(data.attendanceBonus ?? 0);
    this._earlyBonus = Money.from(data.earlyBonus ?? 0);
    this._paidAmount = Money.from(data.paidAmount);
    
    // Calculate totals
    this._expectedTotal = this.calculateExpectedTotal();
    this._difference = this._paidAmount.subtract(this._expectedTotal);
  }

  // Getters
  get id(): string { return this._id; }
  get analysisId(): string { return this._analysisId; }
  get date(): Date { return new Date(this._date); }
  get dayOfWeek(): number { return this._dayOfWeek; }
  get dayName(): string { 
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[this._dayOfWeek];
  }
  get consignments(): ConsignmentCount { return this._consignments; }
  get rate(): Money { return this._rate; }
  get basePayment(): Money { return this._basePayment; }
  get pickups(): ConsignmentCount { return this._pickups; }
  get pickupTotal(): Money { return this._pickupTotal; }
  get unloadingBonus(): Money { return this._unloadingBonus; }
  get attendanceBonus(): Money { return this._attendanceBonus; }
  get earlyBonus(): Money { return this._earlyBonus; }
  get expectedTotal(): Money { return this._expectedTotal; }
  get paidAmount(): Money { return this._paidAmount; }
  get difference(): Money { return this._difference; }

  get totalBonus(): Money {
    return this._unloadingBonus
      .add(this._attendanceBonus)
      .add(this._earlyBonus);
  }

  get status(): PaymentStatus {
    if (this._difference.isZero()) return 'balanced';
    return this._difference.isPositive() ? 'overpaid' : 'underpaid';
  }

  get dateFormatted(): string {
    return format(this._date, 'dd/MM/yyyy');
  }

  get isWorkingDay(): boolean {
    return this._dayOfWeek !== 0; // Not Sunday
  }

  private calculateExpectedTotal(): Money {
    return this._basePayment
      .add(this._pickupTotal)
      .add(this.totalBonus);
  }

  updatePaidAmount(amount: number): void {
    this._paidAmount = Money.from(amount);
    this._difference = this._paidAmount.subtract(this._expectedTotal);
  }

  updatePickupData(count: number, total: number): void {
    this._pickups = ConsignmentCount.from(count);
    this._pickupTotal = Money.from(total);
    this._expectedTotal = this.calculateExpectedTotal();
    this._difference = this._paidAmount.subtract(this._expectedTotal);
  }

  toJSON() {
    return {
      id: this._id,
      analysisId: this._analysisId,
      date: this._date.toISOString(),
      dayOfWeek: this._dayOfWeek,
      consignments: this._consignments.count,
      rate: this._rate.amount,
      basePayment: this._basePayment.amount,
      pickups: this._pickups.count,
      pickupTotal: this._pickupTotal.amount,
      unloadingBonus: this._unloadingBonus.amount,
      attendanceBonus: this._attendanceBonus.amount,
      earlyBonus: this._earlyBonus.amount,
      expectedTotal: this._expectedTotal.amount,
      paidAmount: this._paidAmount.amount,
      difference: this._difference.amount,
      status: this.status,
    };
  }

  static fromJSON(data: Record<string, unknown>): DailyEntry {
    return new DailyEntry({
      id: data.id as string | undefined,
      analysisId: data.analysisId as string,
      date: new Date(data.date as string | number | Date),
      consignments: data.consignments as number,
      rate: data.rate as number,
      basePayment: data.basePayment as number | undefined,
      pickups: data.pickups as number | undefined,
      pickupTotal: data.pickupTotal as number | undefined,
      unloadingBonus: data.unloadingBonus as number | undefined,
      attendanceBonus: data.attendanceBonus as number | undefined,
      earlyBonus: data.earlyBonus as number | undefined,
      paidAmount: data.paidAmount as number,
    });
  }
}