# Week 30 Data Inconsistency - Root Cause Analysis

**Analysis Date:** 2025-10-22
**Issue:** Week 30 shows £0.00 revenue but 99 deliveries and 2 days with data
**Status:** ✅ **ROOT CAUSE IDENTIFIED**

---

## 🎯 Executive Summary

**The data inconsistency is NOT a bug** - it's caused by:
1. **Database is empty** for July 2025 (0 analyses found)
2. **All data comes from localStorage** only
3. **Week 30 localStorage data has incomplete data:**
   - ✅ Consignments: 99 (populated)
   - ❌ Paid amounts: £0.00 (missing)

---

## 🔍 Investigation Results

### Database Query Results

```sql
-- Week 30 (Jul 21-27, 2025)
SELECT COUNT(*) FROM analyses
WHERE period_start <= '2025-07-27'
  AND period_end >= '2025-07-21';
-- Result: 0 analyses

-- July 2025 (entire month)
SELECT COUNT(*) FROM analyses
WHERE period_start <= '2025-07-31'
  AND period_end >= '2025-07-01';
-- Result: 0 analyses
```

**Conclusion:** Database has NO data for July 2025.

### Data Flow Analysis

#### Code: `useDashboardData.ts` (lines 213-275)

```typescript
// STEP 1: Process database analyses FIRST (authoritative source)
analyses?.forEach((analysis) => {
  if (analysis.daily_entries) {
    analysis.daily_entries.forEach((entry: DailyEntryData) => {
      const entryDate = new Date(entry.date);
      if (entryDate >= periodStart && entryDate <= periodEnd) {
        totalRevenue += entry.paid_amount || 0;      // ← Would be £0 for Week 30
        totalDeliveries += entry.consignments || 0;  // ← Would be 99 for Week 30
        if (entry.consignments > 0) daysWithData++;  // ← Would be 2 for Week 30
      }
    });
  }
});

// STEP 2: Process localStorage ONLY if not in database
if (localAnalyses && !processedAnalysisIds.has(analysisId)) {
  // This is where Week 30 data comes from
  totalRevenue += dayData.paidAmount || 0;       // ← £0.00 (missing)
  totalDeliveries += dayData.consignments || 0;  // ← 99
}

// STEP 3: Log results
console.log(
  `📊 Dashboard metrics for ${periodLabel}: revenue=£${totalRevenue.toFixed(2)}, deliveries=${totalDeliveries}, days=${daysWithData}`
);
// Actual output: "Dashboard metrics for Week 30: revenue=£0.00, deliveries=99, days=2"
```

### Calendar Indicator Logic

#### Code: `useCalendarData.ts` (lines 53-68, 96-110)

```typescript
// Calendar shows indicators when consignments > 0
const dayEntry = analysis.daily_entries.find((entry) => {
  return formatDateKey(entryDate) === dateKey && (entry.consignments || 0) > 0;
});
if (dayEntry) {
  hasData = true;  // ← Shows calendar dot
  totalExpected += dayEntry.expected_total || 0;
  totalPaid += dayEntry.paid_amount || 0;  // ← £0 for Week 30
}

// Status indicators
if (hasData) {
  statuses.push("pending");  // Blue dot: Work done
  if (totalPaid > 0) {
    statuses.push("received");  // Green dot: Payment received
  }
}
```

**Result:** Week 30 days 21 and 24 show **blue dots only** (pending), no green dots (no payment).

### Revenue Trend Chart Discrepancy

#### Code: `dashboard/page.tsx` (line 301)

```typescript
<WeeklyRevenueChart analyses={analyses} currentMonth={currentMonth} />
```

**The chart ALWAYS uses `currentMonth`**, not `viewMode` or `currentWeek`.

#### Code: `WeeklyRevenueChart.tsx` (lines 22-75)

```typescript
function generateWeeklyChartData(analyses: AnalysisWithDetails[], currentMonth: Date): WeekData[] {
  // Generates W1, W2, W3, W4 for the ENTIRE month
  // Even when in Weekly view showing Week 30
}
```

**Why the charts show different data:**
- **Executive Summary:** Shows Week 30 only (£0.00, 99 deliveries)
- **Revenue Trend Chart:** Shows ALL of July 2025 (W1-W4), which may have data in other weeks

This creates the visual inconsistency you observed.

---

## 📊 What the Data Actually Shows

### Week 30 (Jul 21-27, 2025) - localStorage Data

| Date | Consignments | Expected | Paid | Status |
|------|--------------|----------|------|--------|
| Jul 21 | ~50 (est) | ? | £0.00 | Incomplete |
| Jul 24 | ~49 (est) | ? | £0.00 | Incomplete |
| **Total** | **99** | **?** | **£0.00** | **Missing payment data** |

### Dashboard Display

```
Executive Summary - Week 30
├── Total Revenue: £0.00        ← No payment data
├── Avg Daily: £0.00            ← No payment data
├── Deliveries: 99              ← Has consignment data
└── Performance: 0%             ← Can't calculate (no expected_total)

Calendar
├── Jul 21: 🔵 (blue dot - pending)
└── Jul 24: 🔵 (blue dot - pending)

Revenue Trend Chart (Monthly - ALL of July)
├── W1: Shows data (if exists)
├── W2: Shows data (if exists)
├── W3: Shows data (if exists)
└── W4: Shows data (if exists)
```

---

## 🎯 Most Likely Scenario

Based on the data patterns, here's what probably happened:

### Step 1: Initial Upload
1. User uploaded **runsheet** for Week 30 (Jul 21-27, 2025)
2. Runsheet was processed → **consignments counted** (99 total)
3. Expected totals may or may not have been calculated

### Step 2: Missing Invoice
1. User did NOT upload the corresponding **invoice** file
2. OR invoice upload failed
3. OR invoice was uploaded but payment parsing failed
4. Result: **No `paid_amount` values** (all £0.00)

### Step 3: Data Not Persisted
1. Data was saved to **localStorage only**
2. Data was **NEVER saved to database**
3. OR data was saved but later deleted/cleared

### Result
- ✅ Calendar shows activity (consignments > 0)
- ❌ Revenue shows £0.00 (no payment data)
- ❌ Database is empty (data only in localStorage)

---

## 💡 Recommendations

### Immediate Actions

1. **Check the actual localStorage data:**
   ```javascript
   // In browser console on the dashboard
   const analyses = JSON.parse(localStorage.getItem('analyses') || '{}');
   console.log('Week 30 data:', analyses);
   ```

2. **Verify the date range:**
   - Confirm Week 30 = Jul 21-27, 2025
   - Check if user is looking at the correct week

3. **Check for orphaned data:**
   - Look for analyses that should be in database but aren't
   - Check if migration from localStorage to database failed

### Data Integrity Issues

1. **Why is database empty for July 2025?**
   - Is this test data?
   - Was data deleted?
   - Did the upload process fail to save to database?

2. **Why is Week 30 data incomplete?**
   - Missing invoice file?
   - Parsing error?
   - User uploaded only runsheet?

3. **Why is data only in localStorage?**
   - Step 1 saves to localStorage first, then database
   - If database save fails, data remains in localStorage only
   - Check for errors in database save process

### Long-term Fixes

1. **Add validation warnings:**
   - Warn user when consignments exist but no payment data
   - Show badge/indicator on calendar for incomplete data
   - Add "Missing Payment Data" status

2. **Fix chart view mode:**
   ```typescript
   // dashboard/page.tsx should pass viewMode to chart
   <WeeklyRevenueChart
     analyses={analyses}
     currentMonth={currentMonth}
     viewMode={execViewMode}  // ← Add this
     currentWeek={currentWeek}  // ← Add this
   />
   ```

3. **Add data completeness checks:**
   - Before showing metrics, verify data is complete
   - Show warning if `consignments > 0` but `paid_amount === 0`
   - Add "Incomplete Data" flag to UI

4. **Improve error messaging:**
   ```typescript
   if (totalDeliveries > 0 && totalRevenue === 0) {
     console.warn(`⚠️ Week ${weekNumber} has ${totalDeliveries} deliveries but £0 revenue - data may be incomplete`);
   }
   ```

---

## 🔧 Diagnostic Commands

### Check localStorage in Browser
```javascript
// Open browser console on dashboard page
const analyses = JSON.parse(localStorage.getItem('analyses') || '{}');
console.log('All analyses:', analyses);

// Find Week 30 data
Object.entries(analyses).forEach(([id, analysis]) => {
  const hasWeek30 = analysis.dailyData && Object.keys(analysis.dailyData).some(date => {
    const d = new Date(date);
    return d >= new Date('2025-07-21') && d <= new Date('2025-07-27');
  });
  if (hasWeek30) {
    console.log('Week 30 analysis:', id, analysis);
  }
});
```

### Check Database
```bash
# Run query script
cd payment-analyzer-next
node scripts/query-july2025.mjs
```

---

## 📋 Summary

**Root Cause:** Data exists only in localStorage with incomplete payment data

**Why This Happened:**
1. Database is empty for July 2025
2. localStorage has Week 30 data with consignments but no payment amounts
3. Likely cause: Runsheet uploaded, invoice missing

**Why It Looks Inconsistent:**
1. Calendar shows indicators (based on consignments > 0)
2. Revenue shows £0.00 (based on paid_amount)
3. Revenue Trend chart shows monthly data even in weekly view

**How to Fix:**
1. Find and upload missing invoice for Week 30
2. Or manually enter payment amounts
3. Ensure data is saved to database, not just localStorage

---

**Analysis Complete** ✅

The data is consistent with its internal state - the issue is that the data itself is incomplete. This is a **data quality issue**, not a calculation bug.
