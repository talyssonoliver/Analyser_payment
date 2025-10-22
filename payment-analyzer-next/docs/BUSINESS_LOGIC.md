# Business Logic & Payment Calculations

**Last Updated**: December 2025
**For**: Understanding payment rules and calculations

This document explains the complete business logic for payment calculations, preserved 100% from the original HTML system.

---

## Payment Rates

### Core Rates

```typescript
weekdayRate:   £2.00  // Monday-Friday
saturdayRate:  £3.00  // Saturday (50% premium)
```

**Sunday**: NOT a working day - no calculations performed

---

## Bonus Structure

### Three Bonus Types

```typescript
unloadingBonus:   £30.00  // Daily (with restrictions)
attendanceBonus:  £25.00  // Weekdays only
earlyBonus:       £50.00  // Weekdays only
```

### Eligibility Rules (CRITICAL)

#### Unloading Bonus (£30)
**Eligible**: Tuesday, Wednesday, Thursday, Friday, Saturday  
**NOT Eligible**: **Monday** and Sunday

#### Attendance Bonus (£25)
**Eligible**: Monday, Tuesday, Wednesday, Thursday, Friday  
**NOT Eligible**: Saturday, Sunday

#### Early Bonus (£50)
**Eligible**: Monday, Tuesday, Wednesday, Thursday, Friday  
**NOT Eligible**: Saturday, Sunday

### Bonus Matrix

| Day | Rate | Unloading | Attendance | Early | Total Bonuses |
|-----|------|-----------|------------|-------|---------------|
| **Monday** | £2.00 | ❌ £0 | ✅ £25 | ✅ £50 | £75 |
| **Tuesday** | £2.00 | ✅ £30 | ✅ £25 | ✅ £50 | £105 |
| **Wednesday** | £2.00 | ✅ £30 | ✅ £25 | ✅ £50 | £105 |
| **Thursday** | £2.00 | ✅ £30 | ✅ £25 | ✅ £50 | £105 |
| **Friday** | £2.00 | ✅ £30 | ✅ £25 | ✅ £50 | £105 |
| **Saturday** | £3.00 | ✅ £30 | ❌ £0 | ❌ £0 | £30 |
| **Sunday** | - | **NO WORK** | **NO WORK** | **NO WORK** | **NO WORK** |

**CRITICAL RULE**: Bonuses are ONLY awarded on days with `consignments > 0`

---

## Calculation Workflow

### Daily Payment Formula

```
expectedTotal = basePayment + totalBonus + pickupTotal

where:
  basePayment = consignments × rate
  totalBonus = unloadingBonus + attendanceBonus + earlyBonus
  pickupTotal = sum of pickup service charges
  
difference = paidAmount - expectedTotal
```

### Step-by-Step Process

```
1. Parse date → determine day of week (0-6)
2. Determine rate:
   - If Saturday (6) → £3.00
   - Else → £2.00
3. Check if working day (consignments > 0):
   YES:
     4. basePayment = consignments × rate
     5. Calculate bonuses:
        - isMonday OR isSunday → unloadingBonus = £0
        - else → unloadingBonus = £30
        - isWeekday (Mon-Fri) → attendanceBonus = £25, earlyBonus = £50
        - else → £0
     6. totalBonus = sum of bonuses
     7. expectedTotal = basePayment + totalBonus + pickupTotal
   NO:
     All values = 0
8. difference = paidAmount - expectedTotal
9. status = 'balanced' | 'overpaid' | 'underpaid'
```

### Example Calculations

**Tuesday with 50 consignments:**
```
Rate: £2.00 (weekday)
Base Payment: 50 × £2.00 = £100.00
Unloading Bonus: £30.00 (Tuesday eligible)
Attendance Bonus: £25.00 (weekday)
Early Bonus: £50.00 (weekday)
Total Bonuses: £105.00
Expected Total: £205.00
```

**Saturday with 50 consignments:**
```
Rate: £3.00 (Saturday premium)
Base Payment: 50 × £3.00 = £150.00
Unloading Bonus: £30.00 (Saturday eligible)
Attendance Bonus: £0.00 (NOT weekday)
Early Bonus: £0.00 (NOT weekday)
Total Bonuses: £30.00
Expected Total: £180.00
```

---

## PDF Processing

### Runsheet Parser

**Purpose**: Extract consignment counts from PDF runsheets

**Patterns**:
```
7-digit IDs: /\b\d{7}\b/g
AH prefix: /\bAH\d+\b/g
Date: /Date:\s*(\d{2}[-/]\d{2}[-/]\d{4})/i
```

**Process**:
1. Split text into tokens (whitespace-separated)
2. Look for patterns: `[number] [7-digit-ID] Delivery`
3. Verify context (nearby "Delivery" or "Collection")
4. Aggregate by date (YYYY-MM-DD format)

**Output**: `Map<dateKey, consignmentCount>`

### Invoice Parser

**Purpose**: Extract payment amounts from PDF invoices

**Patterns**:
```
Date/Time: /(\d{2}\/\d{2}\/\d{2})\s+(\d{2}:\d{2})/g
Amount: /^\d+\.\d{2}/
Pickup: "-PickUp" token after date
Extra Drops: "Extra Drops" + amount
```

**Validation**:
- Amount range: £3.00 - £500.00
- Date/time must be adjacent
- Document total validation (tolerance: £0.01)

**Process**:
1. Split into tokens
2. Find date/time pattern
3. Check for "-PickUp" indicator
4. Search next 30 tokens for amount
5. Validate amount in range
6. Create entry: `{date, time, amount, serviceType}`

**Output**: Array of payment entries

### File Type Detection

**Runsheet**:
- Filename: "runsheet", "dv_"
- Content: "runsheet", "delivery", "consignment"

**Invoice**:
- Filename: "self", "invoice", "bill"
- Content: "invoice", "docket total", "gbp", "£"

---

## Domain Entities

### Analysis (Aggregate Root)

**Properties**:
- `id`: UUID
- `userId`: Owner
- `fingerprint`: SHA-256 hash for duplicate detection
- `status`: 'pending' | 'processing' | 'completed' | 'error'
- `period`: DateRange (start, end)
- `dailyEntries[]`: Array of DailyEntry

**Computed**:
- `totalConsignments`: Sum of all consignments
- `expectedTotal`: Sum of expected payments
- `paidTotal`: Sum of actual payments
- `differenceTotal`: paidTotal - expectedTotal

### DailyEntry

**Properties**:
- `date`: Date object
- `dayOfWeek`: 0-6 (0=Sunday)
- `consignments`: ConsignmentCount
- `rate`: Money (£2 or £3)
- `basePayment`: Money
- `unloadingBonus`: Money
- `attendanceBonus`: Money
- `earlyBonus`: Money
- `paidAmount`: Money

**Computed**:
- `totalBonus`: Sum of bonuses
- `expectedTotal`: basePayment + totalBonus
- `difference`: paidAmount - expectedTotal
- `status`: 'balanced' | 'overpaid' | 'underpaid'

### PaymentRules

**Properties**:
- `weekdayRate`: £2.00
- `saturdayRate`: £3.00
- `unloadingBonus`: £30.00
- `attendanceBonus`: £25.00
- `earlyBonus`: £50.00
- `validFrom`: Date
- `validUntil`: Optional Date

**Methods**:
- `getRateForDay(dayOfWeek)`: Returns £2 or £3
- `getApplicableBonuses(dayOfWeek)`: Returns bonuses for day

---

## Value Objects

### Money

**Purpose**: Currency handling with precision

**Features**:
- Immutable
- 2-decimal precision
- Operations: `add()`, `subtract()`, `multiply()`
- Format: `toString()` returns "£X.XX"

### ConsignmentCount

**Purpose**: Non-negative integer counting

**Features**:
- Immutable
- Validation: must be ≥ 0
- Operations: `add()`, `equals()`

### DateRange

**Purpose**: Period management

**Features**:
- Validates start ≤ end
- Methods: `contains()`, `getWorkingDays()`

---

## Business Rules Summary

### The 5 Core Rules

1. **Sunday is NOT a working day**
2. **Bonuses require consignments** (`consignments > 0`)
3. **Monday has NO unloading bonus** (£0 vs £30)
4. **Saturday has NO attendance/early bonuses** (£0 vs £75)
5. **Saturday has premium rate** (£3 vs £2)

### Working Day Definition

A working day is any day with:
- `consignments > 0` OR
- `pickupTotal > 0`

Sunday is excluded even if data exists.

---

## Constants Reference

**Location**: `src/lib/constants.ts`

```typescript
export const DEFAULT_PAYMENT_RULES = {
  weekdayRate: 2.00,
  saturdayRate: 3.00,
  unloadingBonus: 30.00,
  attendanceBonus: 25.00,
  earlyBonus: 50.00,
} as const;

export const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday'
];
```

---

**For Implementation Details:**
- Architecture → [ARCHITECTURE.md](./ARCHITECTURE.md)
- API Reference → [API.md](./API.md)
