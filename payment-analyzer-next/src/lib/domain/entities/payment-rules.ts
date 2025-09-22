/**
 * PaymentRules Entity
 * Manages payment calculation rules with versioning
 */

import { Money } from '../value-objects/money';
import { generateUUID } from '@/lib/utils';

export interface PaymentRulesData {
  weekdayRate: number;
  saturdayRate: number;
  unloadingBonus: number;
  attendanceBonus: number;
  earlyBonus: number;
}

export class PaymentRules {
  private _id: string;
  private _userId: string;
  private _version: number;
  private _weekdayRate: Money;
  private _saturdayRate: Money;
  private _unloadingBonus: Money;
  private _attendanceBonus: Money;
  private _earlyBonus: Money;
  private _validFrom: Date;
  private _validUntil?: Date;
  private _isActive: boolean;

  constructor(data: {
    id?: string;
    userId: string;
    version?: number;
    weekdayRate: number;
    saturdayRate: number;
    unloadingBonus: number;
    attendanceBonus: number;
    earlyBonus: number;
    validFrom?: Date;
    validUntil?: Date;
    isActive?: boolean;
  }) {
    this._id = data.id || generateUUID();
    this._userId = data.userId;
    this._version = data.version || 1;
    this._weekdayRate = Money.from(data.weekdayRate);
    this._saturdayRate = Money.from(data.saturdayRate);
    this._unloadingBonus = Money.from(data.unloadingBonus);
    this._attendanceBonus = Money.from(data.attendanceBonus);
    this._earlyBonus = Money.from(data.earlyBonus);
    this._validFrom = data.validFrom || new Date();
    this._validUntil = data.validUntil;
    this._isActive = data.isActive ?? true;
  }

  // Getters
  get id(): string { return this._id; }
  get userId(): string { return this._userId; }
  get version(): number { return this._version; }
  get weekdayRate(): Money { return this._weekdayRate; }
  get saturdayRate(): Money { return this._saturdayRate; }
  get unloadingBonus(): Money { return this._unloadingBonus; }
  get attendanceBonus(): Money { return this._attendanceBonus; }
  get earlyBonus(): Money { return this._earlyBonus; }
  get validFrom(): Date { return new Date(this._validFrom); }
  get validUntil(): Date | undefined { return this._validUntil ? new Date(this._validUntil) : undefined; }
  get isActive(): boolean { return this._isActive; }

  getRateForDay(dayOfWeek: number): Money {
    // Saturday = 6
    return dayOfWeek === 6 ? this._saturdayRate : this._weekdayRate;
  }

  getApplicableBonuses(dayOfWeek: number): {
    unloading: Money;
    attendance: Money;
    early: Money;
  } {
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
    const isSunday = dayOfWeek === 0;
    const isMonday = dayOfWeek === 1;

    return {
      // Unloading bonus: All days except Sunday and Monday
      unloading: (isSunday || isMonday) ? Money.zero() : this._unloadingBonus,
      
      // Attendance bonus: Weekdays only
      attendance: isWeekday ? this._attendanceBonus : Money.zero(),
      
      // Early bonus: Weekdays only  
      early: isWeekday ? this._earlyBonus : Money.zero(),
    };
  }

  isValidFor(date: Date): boolean {
    if (!this._isActive) return false;
    
    const dateTime = date.getTime();
    const validFromTime = this._validFrom.getTime();
    const validUntilTime = this._validUntil?.getTime();

    if (dateTime < validFromTime) return false;
    if (validUntilTime && dateTime > validUntilTime) return false;

    return true;
  }

  createNewVersion(updates: Partial<PaymentRulesData>): PaymentRules {
    return new PaymentRules({
      userId: this._userId,
      version: this._version + 1,
      weekdayRate: updates.weekdayRate ?? this._weekdayRate.amount,
      saturdayRate: updates.saturdayRate ?? this._saturdayRate.amount,
      unloadingBonus: updates.unloadingBonus ?? this._unloadingBonus.amount,
      attendanceBonus: updates.attendanceBonus ?? this._attendanceBonus.amount,
      earlyBonus: updates.earlyBonus ?? this._earlyBonus.amount,
      validFrom: new Date(),
      isActive: true,
    });
  }

  deactivate(): void {
    this._isActive = false;
    this._validUntil = new Date();
  }

  toJSON() {
    return {
      id: this._id,
      userId: this._userId,
      version: this._version,
      weekdayRate: this._weekdayRate.amount,
      saturdayRate: this._saturdayRate.amount,
      unloadingBonus: this._unloadingBonus.amount,
      attendanceBonus: this._attendanceBonus.amount,
      earlyBonus: this._earlyBonus.amount,
      validFrom: this._validFrom.toISOString(),
      validUntil: this._validUntil?.toISOString(),
      isActive: this._isActive,
    };
  }

  static fromJSON(data: Record<string, unknown>): PaymentRules {
    return new PaymentRules({
      id: data.id as string | undefined,
      userId: data.userId as string,
      version: data.version as number | undefined,
      weekdayRate: data.weekdayRate as number,
      saturdayRate: data.saturdayRate as number,
      unloadingBonus: data.unloadingBonus as number,
      attendanceBonus: data.attendanceBonus as number,
      earlyBonus: data.earlyBonus as number,
      validFrom: new Date(data.validFrom as string | number | Date),
      validUntil: data.validUntil ? new Date(data.validUntil as string | number | Date) : undefined,
      isActive: data.isActive as boolean | undefined,
    });
  }
}