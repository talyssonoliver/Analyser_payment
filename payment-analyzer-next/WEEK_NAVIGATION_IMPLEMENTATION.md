# Week Navigation System Implementation

## Overview

This document outlines the implementation of the week navigation system that restores the legacy workflow where clicking week titles navigates to week-specific reports.

## Legacy Behavior Analysis

From the original HTML file (`payment-analyzer-multipage.v9.0.0.html`), the legacy system worked as follows:

1. **Week Title Click Handler** (lines 12120-12137):
   ```javascript
   header.addEventListener('click', (e) => {
       if (e.target.closest('.week-title')) {
           const weekTitle = header.querySelector('.week-title');
           if (weekTitle && weekTitle.textContent) {
               const match = weekTitle.textContent.match(/Week (\d+), (\d+)/);
               if (match) {
                   const weekInfo = {
                       week: parseInt(match[1]),
                       year: parseInt(match[2])
                   };
                   // Navigate to reports with selected week
                   const State = requireModule('stateModule');
                   State.setSelectedWeek(weekInfo);
                   requireModule('routerModule').navigate('reports');
               }
           }
       }
   });
   ```

2. **State Management** (lines 7567-7579):
   ```javascript
   let selectedWeek = null;

   exports.setSelectedWeek = function(weekInfo) {
       selectedWeek = weekInfo;
       console.log('📅 Selected week set:', weekInfo);
   };

   exports.getSelectedWeek = function() {
       return selectedWeek;
   };

   exports.clearSelectedWeek = function() {
       selectedWeek = null;
       console.log('📅 Selected week cleared');
   };
   ```

3. **Reports Page Integration** (lines 13332-13342):
   ```javascript
   const selectedWeek = State.getSelectedWeek();
   if (selectedWeek) {
       const analysisModule = requireModule('analysisModule');
       if (analysisModule && analysisModule.generateWeekAnalysisDataForReports) {
           currentReportData = analysisModule.generateWeekAnalysisDataForReports(
               selectedWeek.week,
               selectedWeek.year,
               0
           );
           if (currentReportData && currentReportData.results) {
               UI.renderReport(currentReportData);
           }
       }
   }
   ```

## Modern Implementation

### 1. WeekNavigationService

**File**: `src/lib/services/week-navigation-service.ts`

This service replicates the legacy state management and navigation behavior:

- **State Management**:
  - `setSelectedWeek(weekInfo, analysisId?)` - equivalent to `State.setSelectedWeek()`
  - `getSelectedWeek()` - equivalent to `State.getSelectedWeek()`
  - `clearSelectedWeek()` - equivalent to `State.clearSelectedWeek()`

- **Navigation**:
  - `navigateToWeekReport(weekInfo, analysisId?, router?)` - replicates the legacy navigation flow

- **Persistence**: Uses `sessionStorage` for browser navigation persistence

- **Week Report Generation**:
  - `generateInlineWeekReport()` - integrates with existing `InlineReportGenerator`

### 2. Step 3 Component Updates

**File**: `src/components/analysis/step3-analyze-section-v2.tsx`

Enhanced the component to restore proper week navigation:

- **Week Title Click Handler** (lines 182-202):
  ```typescript
  const handleWeekTitleClick = (weekNumber: number, weekYear: number) => {
    console.log(`📅 Week title clicked: Week ${weekNumber}, ${weekYear}`);

    try {
      const weekInfo: WeekInfo = {
        week: weekNumber,
        year: weekYear
      };

      const analysisId = lastAnalysisData?.id || null;
      const currentUrl = window.location.pathname + window.location.search;
      weekNavigationService.setReturnUrl(currentUrl);

      // Navigate to week-specific report (replicates legacy behavior)
      weekNavigationService.navigateToWeekReport(weekInfo, analysisId, router);
    } catch (error) {
      console.error('Failed to navigate to week report:', error);
      // Fallback: show inline week report
      handleViewWeekReport(weekNumber, weekYear, 0);
    }
  };
  ```

- **Enhanced Week Report Buttons** (lines 78-166):
  - Option 1: Use enhanced navigation with proper URL parameters
  - Option 2: Fallback to legacy week grouping logic
  - Both approaches ensure backward compatibility

### 3. Reports Page Integration

**File**: `src/app/(dashboard)/reports/page.tsx`

Enhanced the reports page to handle week navigation state:

- **Week State Detection** (lines 238-264):
  ```typescript
  // Check for week navigation state (legacy State.getSelectedWeek() behavior)
  const selectedWeek = weekNavigationService.getSelectedWeek();
  const weekAnalysisId = weekNavigationService.getAnalysisId();

  // Priority 1: URL parameters override navigation state
  // Priority 2: Week navigation state if no URL parameters
  if (!analysisId && !weekFilter && selectedWeek && weekAnalysisId) {
    // Use week navigation state as fallback
    finalAnalysisId = weekAnalysisId;
    finalWeekFilter = selectedWeek.week.toString();

    // Calculate date range from week info
    const weekStartDate = getWeekStartDate(selectedWeek.year, selectedWeek.week);
    const weekEndDate = getWeekEndDate(selectedWeek.year, selectedWeek.week);
    finalStartDate = weekStartDate.toISOString().split('T')[0];
    finalEndDate = weekEndDate.toISOString().split('T')[0];
  }
  ```

- **State Cleanup** (lines 319-324):
  ```typescript
  // Clear week navigation state after successful load to prevent stale state
  if (selectedWeek && weekAnalysisId && !analysisId) {
    console.log('🔍 Reports Debug - Clearing week navigation state after successful load');
    setTimeout(() => weekNavigationService.clearSelectedWeek(), 1000);
  }
  ```

## Navigation Flow

### 1. Week Title Click Flow

1. User clicks on a week title in Step 3 analysis results
2. `handleWeekTitleClick()` is triggered with week number and year
3. `WeekNavigationService.setSelectedWeek()` stores the week info and analysis ID
4. `WeekNavigationService.navigateToWeekReport()` calculates date range and builds URL
5. Router navigates to `/reports?analysis={id}&week={week}&start={start}&end={end}`

### 2. Week Report Button Flow

1. User clicks on a week report button in Step 3 analysis results
2. `handleViewWeekReport()` is triggered with week number, year, and index
3. Enhanced logic sets week state and navigates with proper URL parameters
4. Fallback to legacy week grouping if needed

### 3. Reports Page Loading Flow

1. Reports page loads and checks URL parameters
2. If no URL parameters, checks for week navigation state
3. Uses week navigation state to set filtering parameters
4. Loads analysis data and filters by week date range
5. Displays week-specific report
6. Clears week navigation state to prevent stale data

## URL Parameter Structure

Week-specific reports use the following URL structure:

```
/reports?analysis={analysisId}&week={weekNumber}&start={YYYY-MM-DD}&end={YYYY-MM-DD}
```

Where:
- `analysis`: The analysis ID (UUID or session ID)
- `week`: The week number (1-53)
- `start`: Week start date (Monday) in YYYY-MM-DD format
- `end`: Week end date (Sunday) in YYYY-MM-DD format

## Backward Compatibility

The implementation maintains full backward compatibility:

1. **Existing report buttons**: Continue to work with enhanced navigation
2. **Legacy data structures**: All week info objects use the same `{week, year}` format
3. **Fallback mechanisms**: Multiple fallback paths ensure robustness
4. **State persistence**: Uses sessionStorage for browser navigation persistence

## Integration with Existing Services

The week navigation system integrates seamlessly with:

1. **InlineReportGenerator**: For week-specific report data generation
2. **Analysis Repository**: For loading analysis data by ID
3. **Router**: For navigation between pages
4. **Session Storage**: For state persistence across navigation

## Testing Verification

To verify the implementation works correctly:

1. **Week Title Clicks**:
   - Click week titles in Step 3 analysis results
   - Verify navigation to `/reports` with correct parameters
   - Verify week-specific data filtering

2. **Week Report Buttons**:
   - Click week report buttons in Step 3 analysis results
   - Verify navigation to week-specific reports
   - Verify fallback to inline reports if needed

3. **State Management**:
   - Verify week state is set correctly on navigation
   - Verify state is cleared after successful report load
   - Verify state persists across browser navigation

4. **URL Parameters**:
   - Verify correct URL parameter generation
   - Verify date range calculations (Monday to Sunday)
   - Verify analysis ID preservation

## Implementation Status

✅ **COMPLETED**:
- WeekNavigationService for state management
- Step 3 component integration with proper week navigation
- Reports page integration with week state handling
- URL parameter generation and parsing
- State persistence with sessionStorage
- Backward compatibility with existing functionality

The week navigation system has been successfully implemented and restores the legacy workflow where clicking week titles navigates to week-specific reports, while maintaining full compatibility with the existing analysis workflow.