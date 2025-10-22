# Invoice-Only Upload Phantom Expected Amount Fix

## Problem Summary

When uploading ONLY an invoice PDF (without a runsheet), the system was creating "phantom" expected amounts instead of showing expected = £0.00. This created false payment discrepancies.

### Example Bug Behavior
- Upload invoice PDF only (no runsheet)
- Invoice shows £819.40 in payments
- System displays: Expected Total: £50.00 (FAKE DATA)
- Should show: Expected Total: £0.00 (no runsheet = no expected)

## Root Cause Analysis

The bug was in `src/lib/services/analysis-service.ts` in THREE methods that create `DailyEntry` objects from invoice-only data:

### 1. `createDailyEntryFromInvoice()` (Lines 556-571)
```typescript
// BEFORE (WRONG):
const dayOfWeek = date.getDay();
const rate = paymentRules.getRateForDay(dayOfWeek); // Gets £50.00 rate
return new DailyEntry({
  consignments: 0,
  rate: rate.amount, // ❌ Sets rate even though no runsheet data
  paidAmount: amount,
  // ... bonuses all 0
});
```

**Problem**: Even with `consignments: 0`, setting a `rate` causes `DailyEntry` to calculate:
- `basePayment = consignments * rate = 0 * £50 = £0` ✓
- But if there are pickup services, `expectedTotal = basePayment + pickupTotal` = £0 + £50 = **£50 PHANTOM**

### 2. `processPickupServices()` - New Entry Creation (Lines 498-516)
```typescript
// BEFORE (WRONG):
const dayOfWeek = date.getDay();
const rate = paymentRules.getRateForDay(dayOfWeek);
entries.push(new DailyEntry({
  consignments: 0,
  rate: rate.amount, // ❌ Creates phantom expected
  paidAmount: 0,     // ❌ Should be pickup.amount
  pickups: 1,
  pickupTotal: pickup.amount,
  // ... bonuses all 0
}));
```

**Problem**: This creates phantom expected amounts from pickup services when no runsheet exists.

### 3. `updateEntryWithPayment()` (Lines 523-549)
```typescript
// BEFORE (WRONG):
const rate = paymentRules.getRateForDay(dayOfWeek);
entries[index] = new DailyEntry({
  consignments: existingEntry.consignments.count,
  rate: rate.amount, // ❌ Overwrites existing rate (might be 0)
  paidAmount: newPaidAmount,
  // ...
});
```

**Problem**: When updating an invoice-only entry with additional payments, it would recalculate the rate from payment rules, potentially creating phantom expected amounts.

## The Fix

Changed all three methods to properly handle invoice-only data by setting `rate: 0`:

### 1. Fixed `createDailyEntryFromInvoice()`
```typescript
// AFTER (CORRECT):
return new DailyEntry({
  analysisId: "",
  date,
  consignments: 0,
  rate: 0, // ✅ No runsheet = no expected amount
  paidAmount: amount,
  pickups: 0,
  unloadingBonus: 0,
  attendanceBonus: 0,
  earlyBonus: 0,
});
```

### 2. Fixed `processPickupServices()` - New Entry Creation
```typescript
// AFTER (CORRECT):
entries.push(new DailyEntry({
  analysisId: "",
  date,
  consignments: 0,
  rate: 0, // ✅ No runsheet = no rate-based expected
  paidAmount: pickup.amount, // ✅ Reflects actual payment
  pickups: 1,
  pickupTotal: pickup.amount,
  unloadingBonus: 0,
  attendanceBonus: 0,
  earlyBonus: 0,
}));
```

### 3. Fixed `updateEntryWithPayment()`
```typescript
// AFTER (CORRECT):
entries[index] = new DailyEntry({
  analysisId: "",
  date: existingEntry.date,
  consignments: existingEntry.consignments.count,
  rate: existingEntry.rate.amount, // ✅ Preserve existing rate (might be 0)
  paidAmount: newPaidAmount,
  pickups: existingEntry.pickups?.count || 0,
  pickupTotal: existingEntry.pickupTotal?.amount || 0, // ✅ Also preserve pickup total
  unloadingBonus: existingEntry.unloadingBonus.amount,
  attendanceBonus: existingEntry.attendanceBonus.amount,
  earlyBonus: existingEntry.earlyBonus.amount,
});
```

## Key Principle

**Expected amounts should ONLY be calculated from runsheet data (consignment counts).**

- ✅ Runsheet upload → Calculate expected from `consignments * rate + bonuses`
- ✅ Invoice upload → Match with existing runsheet data if dates overlap
- ❌ Invoice-only upload → **NO phantom expected amounts** - set `rate: 0`

## Expected Behavior After Fix

### Scenario 1: Invoice-only upload (no existing runsheet)
- Expected Total: **£0.00** (no runsheet data)
- Paid Amount: £819.40 (from invoice)
- Difference: +£819.40 (overpaid relative to no expected work)
- Status: Shows as "no runsheet data" indicator

### Scenario 2: Invoice upload with overlapping runsheet
- System detects date overlap
- Returns 409 Conflict
- User prompted to merge files
- Merged analysis shows: Expected from runsheet + Paid from invoice

### Scenario 3: Runsheet → then Invoice upload separately
- First analysis: Expected from runsheet, Paid = £0
- Second upload: Overlap detected → merge prompt
- Merged: Expected + Paid both present

## Testing Checklist

- [ ] Upload invoice-only PDF → Expected should be £0.00
- [ ] Upload runsheet + invoice together → Expected calculated correctly
- [ ] Upload runsheet first → then invoice → Overlap detection triggers
- [ ] Upload invoice with pickup services only → No phantom £50.00 expected
- [ ] Verify pickup services show in pickupTotal but not in expectedTotal (when no runsheet)

## Files Modified

- `src/lib/services/analysis-service.ts`
  - `createDailyEntryFromInvoice()` (lines 556-575)
  - `processPickupServices()` (lines 498-519)
  - `updateEntryWithPayment()` (lines 523-551)

## Related Issues

- Initial bug report: Invoice-only upload showing Expected: £50.00 with 0 consignments
- Overlap detection implementation: CRITICAL_FIX_IMPLEMENTATION_SUMMARY.md
- Database migration: 013_add_date_range_overlap_index.sql

## Date
2025-01-XX (Fix applied after testing revealed overlap detection was working but phantom data bug persisted)
