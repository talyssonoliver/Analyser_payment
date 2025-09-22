/**
 * Money Value Object
 * Handles currency amounts with proper precision and validation
 */

export class Money {
  private readonly _amount: number;

  constructor(amount: number) {
    if (!this.isValidAmount(amount)) {
      throw new Error('Invalid money amount');
    }
    // Round to 2 decimal places to avoid floating point issues
    this._amount = Math.round(amount * 100) / 100;
  }

  get amount(): number {
    return this._amount;
  }

  static zero(): Money {
    return new Money(0);
  }

  static from(amount: number): Money {
    return new Money(amount);
  }

  add(other: Money): Money {
    return new Money(this._amount + other._amount);
  }

  subtract(other: Money): Money {
    return new Money(this._amount - other._amount);
  }

  multiply(multiplier: number): Money {
    return new Money(this._amount * multiplier);
  }

  equals(other: Money): boolean {
    return this._amount === other._amount;
  }

  isPositive(): boolean {
    return this._amount > 0;
  }

  isNegative(): boolean {
    return this._amount < 0;
  }

  isZero(): boolean {
    return this._amount === 0;
  }

  toString(): string {
    return `£${this._amount.toFixed(2)}`;
  }

  toJSON(): number {
    return this._amount;
  }

  private isValidAmount(amount: number): boolean {
    return typeof amount === 'number' && 
           !isNaN(amount) && 
           isFinite(amount);
  }
}