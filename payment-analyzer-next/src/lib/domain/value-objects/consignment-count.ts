/**
 * ConsignmentCount Value Object
 * Represents the number of consignments delivered on a day
 */

export class ConsignmentCount {
  private readonly _count: number;

  constructor(count: number) {
    if (!this.isValidCount(count)) {
      throw new Error('Invalid consignment count: must be a non-negative integer');
    }
    this._count = count;
  }

  get count(): number {
    return this._count;
  }

  static zero(): ConsignmentCount {
    return new ConsignmentCount(0);
  }

  static from(count: number): ConsignmentCount {
    return new ConsignmentCount(count);
  }

  add(other: ConsignmentCount): ConsignmentCount {
    return new ConsignmentCount(this._count + other._count);
  }

  equals(other: ConsignmentCount): boolean {
    return this._count === other._count;
  }

  isZero(): boolean {
    return this._count === 0;
  }

  toString(): string {
    return this._count.toString();
  }

  toJSON(): number {
    return this._count;
  }

  private isValidCount(count: number): boolean {
    return typeof count === 'number' && 
           !isNaN(count) && 
           isFinite(count) && 
           count >= 0 && 
           Number.isInteger(count);
  }
}