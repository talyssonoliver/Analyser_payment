/**
 * DateRange Value Object
 * Represents a period between two dates with validation
 */

import { format } from 'date-fns';

export class DateRange {
  private readonly _start: Date;
  private readonly _end: Date;

  constructor(start: Date, end: Date) {
    if (start > end) {
      throw new Error('Start date must be before or equal to end date');
    }
    this._start = new Date(start);
    this._end = new Date(end);
  }

  get start(): Date {
    return new Date(this._start);
  }

  get end(): Date {
    return new Date(this._end);
  }

  contains(date: Date): boolean {
    return date >= this._start && date <= this._end;
  }

  getDayCount(): number {
    const diffTime = this._end.getTime() - this._start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  getWorkingDays(): Date[] {
    const workingDays: Date[] = [];
    const current = new Date(this._start);

    while (current <= this._end) {
      const dayOfWeek = current.getDay();
      // Skip Sundays (0)
      if (dayOfWeek !== 0) {
        workingDays.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    return workingDays;
  }

  formatRange(): string {
    const startStr = format(this._start, 'dd/MM/yyyy');
    const endStr = format(this._end, 'dd/MM/yyyy');
    return `${startStr} - ${endStr}`;
  }

  equals(other: DateRange): boolean {
    return this._start.getTime() === other._start.getTime() &&
           this._end.getTime() === other._end.getTime();
  }

  toJSON() {
    return {
      start: this._start.toISOString(),
      end: this._end.toISOString(),
    };
  }

  static fromJSON(data: { start: string; end: string }): DateRange {
    return new DateRange(new Date(data.start), new Date(data.end));
  }

  static singleDay(date: Date): DateRange {
    return new DateRange(date, date);
  }
}