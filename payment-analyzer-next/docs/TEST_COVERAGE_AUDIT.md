# Test Coverage Audit

**Generated**: October 15, 2025
**Coverage Tool**: Vitest with V8 provider
**Last Test Run**: October 15, 2025

---

## Executive Summary

### Overall Code Coverage

| Metric | Coverage | Covered | Total | Status |
|--------|----------|---------|-------|--------|
| **Lines** | **32.04%** | 10,929 | 34,105 | ⚠️ Below threshold (80%) |
| **Statements** | **32.04%** | 10,929 | 34,105 | ⚠️ Below threshold (80%) |
| **Functions** | **53.02%** | 561 | 1,058 | ⚠️ Below threshold (80%) |
| **Branches** | **82.62%** | 2,150 | 2,602 | ✅ Above threshold (75%) |

### Latest Run Highlights (Oct 15, 2025)
- Coverage threshold gate failed (80% lines/statements/functions). See temporary threshold plan below.
- 0% coverage on all Next.js API routes under `src/app/api/*` (analysis, export, preferences, migration, upload, health).
- 0% coverage on `middleware.ts` and several core utilities: `data-sanitizer.ts`, `error-handler.ts`, `logger.ts`, `performance-monitor.ts`, `safe-storage.ts`, `timezone-cache.ts`.
- Low service coverage: `analysis-service.ts` 8.58%, `export-service.ts` 5.03%, `compressed-storage-service.ts` 10.24%, `analysis-storage-service.ts` 14.55%, `analytics-service.ts` 6.45%, `session-recovery-service.ts` 11.4%, `week-navigation-service.ts` 14.72%, `inline-report-generator.ts` 3.27%, `file-update-detection-service.ts` 0%.
- Strong areas: `payment-calculation-service.ts` 95.65%, domain entities and rules ~100%, and reports UI (`ReportEmptyState.tsx`, `ReportHeader.tsx`, `ReportTable.tsx`) at or near 100%.

### Test Suite Summary

| Test Type | Count | Description |
|-----------|-------|-------------|
| **Unit Tests** | 36 | Component, service, and utility tests |
| **Integration Tests** | 9 | Feature and workflow tests |
| **E2E Tests** | 1 | End-to-end user flows |
| **Total** | **46 test files** | ~500+ individual test cases |

### Source File Coverage Distribution

| Coverage Level | Files | Percentage | Status |
|----------------|-------|------------|--------|
| **High (≥80%)** | 64 | 27.2% | ✅ Good |
| **Medium (50-79%)** | 15 | 6.4% | ⚠️ Acceptable |
| **Low (<50%)** | 66 | 28.1% | ❌ Needs work |
| **None (0%)** | 90 | 38.3% | ❌ Critical gap |
| **Total** | **235 files** | 100% | - |

**Key Finding**: Only ~27% of source files meet the 80% coverage threshold. Nearly 40% of files have no test coverage at all.

---

## Coverage by Code Category

### Components (116 files)
- **Average Coverage**: 37.3%
- **Well Tested (≥80%)**: 38 files (32.8%) ✅
- **No Coverage (0%)**: 38 files (32.8%) ❌
- **Status**: Mixed - Good coverage on core analysis components, poor on layout/UI

**Well-Tested Components**:
- File upload components (100%)
- Dashboard widgets: CalendarWidget, QuickActions, ExecutiveSummary (100%)
- Analysis containers: Step1/Step2/Step3 (100%)
- Validation components (high coverage)

**Gaps**:
- Layout components (sidebar, navigation)
- Error boundaries
- Settings components
- Chart components

### Services (15 files)
- **Average Coverage**: 20.3%
- **Well Tested (≥80%)**: 1 file (6.7%) ⚠️
- **No Coverage (0%)**: 1 file (6.7%)
- **Status**: Poor - Critical business logic undertested

**Critical Gaps**:
- `file-update-detection-service.ts` (0%)
- Payment calculation service (partial)
- Export service (partial)
- Analytics service (partial)

### Hooks (20 files)
- **Average Coverage**: 51.7%
- **Well Tested (≥80%)**: 8 files (40.0%) ✅
- **No Coverage (0%)**: 6 files (30.0%) ⚠️
- **Status**: Moderate - Custom hooks need more testing

**Well-Tested**:
- Analysis-related hooks
- Session recovery hooks
- Validation hooks

**Gaps**:
- Compression storage hooks
- File validation hooks
- Timezone hooks
- Media query hooks

### Utils (15 files)
- **Average Coverage**: 15.2%
- **Well Tested (≥80%)**: 0 files (0.0%) ❌
- **No Coverage (0%)**: 6 files (40.0%) ❌
- **Status**: Critical - Utility functions are foundational

**Critical Gaps** (0% coverage):
- `data-sanitizer.ts` - Data cleaning/validation
- `error-handler.ts` - Error handling logic
- `logger.ts` - Logging infrastructure
- `performance-monitor.ts` - Performance tracking
- `safe-storage.ts` - Storage utilities
- `timezone-cache.ts` - Timezone calculations

### API Routes (9 files)
- **Average Coverage**: 0.0%
- **Well Tested (≥80%)**: 0 files (0.0%) ❌
- **No Coverage (0%)**: 9 files (100%) ❌
- **Status**: Critical - No API endpoint testing

**All API Routes Untested**:
- Analysis CRUD operations
- File upload endpoints
- Export endpoints
- Health check endpoint
- Migration endpoint
- Preferences endpoint

### Pages (20 files)
- **Average Coverage**: 16.7%
- **Well Tested (≥80%)**: 3 files (15.0%) ⚠️
- **No Coverage (0%)**: 16 files (80.0%) ❌
- **Status**: Poor - Page components undertested

**Gaps**:
- All auth pages (login, signup, reset-password)
- Dashboard page
- Settings page
- History page
- Privacy/Terms pages

### Lib/Infrastructure (39 files)
- **Average Coverage**: 45.4%
- **Well Tested (≥80%)**: 14 files (35.9%) ✅
- **No Coverage (0%)**: 14 files (35.9%) ⚠️
- **Status**: Mixed - Domain logic well tested, infrastructure gaps

**Well-Tested**:
- Domain entities and value objects (partial)
- Repository patterns
- Some PDF parsing logic

**Gaps**:
- PDF worker implementation
- Supabase client wrappers
- Auth middleware
- Dynamic loading/optimization utilities

---

## Test Suite Analysis

### Unit Tests (36 files)

**Well-Covered Areas**:
- `components/analysis/` - Comprehensive component tests
- `components/dashboard/` - Widget and UI component tests
- `components/reports/` - Report display logic tests
- `domain/` - Business rule tests (partial)
- `services/` - Some service tests

**Coverage Highlights**:
- File upload component suite: 83 test cases
- Dashboard components: 100+ test cases
- Validation logic: Comprehensive edge cases

### Integration Tests (9 files)

**Existing Tests**:
- `containers/Step1Container.test.tsx` - File upload workflow
- `pages/reports-page.test.tsx` - Report display integration
- `pages/settings-page.test.tsx` - Settings management
- `dashboard/` - Dashboard data flow tests
- `critical-fixes-integration.test.ts` - Bug fix verification

**Gaps**:
- No full analysis workflow integration tests
- Missing cross-service integration tests
- No Supabase integration tests
- No PDF processing integration tests

### E2E Tests (1 file)

**Critical Gap**: Only 1 E2E test file exists

**Missing E2E Coverage**:
- Complete user registration → analysis → export flow
- Multi-file upload scenarios
- Week navigation and filtering
- Report generation and export
- Error recovery flows

---

## Critical Testing Gaps

### Priority 1: High-Risk, No Coverage

#### 1. API Routes (9 files, 0% coverage)
**Risk**: API bugs can break entire features
**Impact**: High - Direct user interaction points

**Recommendations**:
```typescript
// Need integration tests for:
- POST /api/analysis (create analysis)
- GET /api/analysis/[id] (retrieve analysis)
- PUT /api/analysis/[id]/update (update analysis)
- POST /api/analysis/upload (file upload)
- GET /api/export (export data)
```

#### 2. Utility Functions (6 files, 0% coverage)
**Risk**: Utilities used throughout codebase
**Impact**: High - Bugs cascade to all consumers

**Critical Files**:
- `data-sanitizer.ts` - Used in all data processing
- `error-handler.ts` - Used for all error handling
- `logger.ts` - Used for debugging/monitoring

**Action**: Create comprehensive unit tests for each utility

#### 3. Authentication & Middleware (0% coverage)
**Risk**: Security vulnerabilities
**Impact**: Critical - Could expose user data

**Files**:
- `middleware.ts` - Route protection
- `lib/middleware/auth.ts` - Auth logic
- `lib/stores/auth-store.ts` - Auth state

**Action**: Add auth flow integration tests

### Priority 2: Critical Business Logic, Partial Coverage

#### 4. Payment Calculation Service
**Current Coverage**: ~40-60% (estimated)
**Risk**: Incorrect calculations = incorrect pay
**Action**:
- Add edge case tests (holidays, overtime, bonuses)
- Test all payment rule variations
- Verify week boundary calculations

#### 5. PDF Parsing (invoice-parser, runsheet-parser)
**Current Coverage**: ~50-70% (estimated)
**Risk**: Failed parsing = lost data
**Action**:
- Test all PDF format variations
- Test malformed/corrupt PDFs
- Verify extraction accuracy

#### 6. Week Navigation Service
**Current Coverage**: ~30-40% (estimated)
**Risk**: Wrong week = wrong data displayed
**Action**:
- Test week boundary calculations
- Test timezone edge cases
- Test year transitions

### Priority 3: User Experience Impact

#### 7. Export Service
**Current Coverage**: Partial
**Risk**: Failed exports frustrate users
**Action**:
- Test all export formats (PDF, Excel, CSV)
- Test large dataset exports
- Test export error handling

#### 8. Session Recovery Service
**Current Coverage**: Partial
**Risk**: Lost user work
**Action**:
- Test recovery scenarios
- Test corruption handling
- Test migration between versions

---

## Well-Tested Areas (Keep Maintaining)

### Components with 100% Coverage ✅

1. **File Upload System**
   - `FileUploadMethods.tsx`
   - `FileUploadArea.tsx`
   - `FileList.tsx`
   - All edge cases covered (validation, limits, errors)

2. **Dashboard Widgets**
   - `CalendarWidget.tsx` (35 tests)
   - `QuickActions.tsx` (25 tests)
   - `ExecutiveSummary.tsx`
   - `ViewToggle.tsx` (27 tests)

3. **Analysis Workflow Containers**
   - `Step1Container.tsx`
   - `Step2Container.tsx`
   - `Step3Container.tsx`
   - All user interactions tested

4. **Validation Components**
   - Fingerprint detection
   - File validation
   - Badge system

**Success Pattern**: These components have:
- Comprehensive interaction tests
- Edge case coverage
- Accessibility tests
- Error state tests
- Loading state tests

---

## Recommendations

### Immediate Actions (Next Sprint)

1. **Add API Route Tests** (Priority 1)
   ```bash
   # Create new test files
   tests/integration/api/analysis.test.ts
   tests/integration/api/export.test.ts
   tests/integration/api/upload.test.ts
   ```
   - Use Vitest with MSW (Mock Service Worker)
   - Test request validation
   - Test error responses
   - Test authorization

2. **Test Critical Utilities** (Priority 1)
   ```bash
   # Create new test files
   tests/unit/utils/data-sanitizer.test.ts
   tests/unit/utils/error-handler.test.ts
   tests/unit/utils/logger.test.ts
   ```
   - Focus on edge cases
   - Test error conditions
   - Verify type safety

3. **Auth Flow Integration Tests** (Priority 1)
   ```bash
   tests/integration/auth/login-flow.test.ts
   tests/integration/auth/middleware.test.ts
   ```
   - Test protected routes
   - Test token refresh
   - Test unauthorized access

### Short-term Goals (Next 2-4 Weeks)

4. **Increase Service Coverage to 80%**
   - Payment calculation edge cases
   - Export service format variations
   - Analytics service tracking
   - File fingerprinting edge cases

5. **Add E2E Critical Path Tests**
   ```bash
   tests/e2e/complete-analysis-flow.test.ts
   tests/e2e/export-workflow.test.ts
   tests/e2e/week-navigation.test.ts
   ```
   - Use Playwright
   - Test happy paths
   - Test error recovery

6. **Test Page Components**
   - Settings page interactions
   - Dashboard data loading
   - Report filtering and sorting

### Long-term Strategy (Next Quarter)

7. **Coverage Targets**
   - Lines: 60% → 80%
   - Functions: 53% → 80%
   - Branches: Maintain 82%+
   - Critical paths: 95%+

8. **Test Infrastructure**
   - Set up visual regression testing
   - Add performance benchmarks
   - Implement contract testing for API
   - Add mutation testing

9. **CI/CD Integration**
   - Block PRs below 70% coverage on new code
   - Add coverage badges to README
   - Generate coverage reports in CI
   - Alert on coverage regression

### Testing Best Practices to Adopt

1. **Test Naming Convention**
   ```typescript
   // Current: Variable naming
   it('should validate files')

   // Better: Descriptive scenarios
   it('should reject files exceeding 10MB limit')
   it('should accept PDF and Excel files only')
   ```

2. **Arrange-Act-Assert Pattern**
   ```typescript
   test('should calculate overtime correctly', () => {
     // Arrange
     const hours = 45;
     const rate = 20;

     // Act
     const result = calculatePay(hours, rate);

     // Assert
     expect(result.overtime).toBe(100);
   });
   ```

3. **Test Data Builders**
   ```typescript
   // Create reusable test data factories
   const analysisBuilder = () => ({
     id: uuid(),
     entries: [],
     status: 'pending',
     ...
   });
   ```

4. **Mock Sparingly**
   - Prefer real implementations for utils
   - Mock external dependencies (API, DB)
   - Use MSW for HTTP mocking
   - Avoid over-mocking (brittle tests)

---

## Coverage Monitoring

### Current Thresholds (vitest.config.ts)

```typescript
thresholds: {
  lines: 80,      // Current: 32.04% ❌
  functions: 80,  // Current: 53.02% ❌
  branches: 75,   // Current: 82.62% ✅
  statements: 80, // Current: 32.04% ❌
}
```

**Recommendation**: Lower thresholds temporarily to prevent CI failures, then incrementally increase:

```typescript
// Phase 1 (Current sprint)
thresholds: {
  lines: 35,
  functions: 55,
  branches: 75,
  statements: 35,
}

// Phase 2 (Next month)
thresholds: {
  lines: 50,
  functions: 65,
  branches: 78,
  statements: 50,
}

// Phase 3 (Quarter end)
thresholds: {
  lines: 70,
  functions: 75,
  branches: 80,
  statements: 70,
}

// Final target
thresholds: {
  lines: 80,
  functions: 80,
  branches: 80,
  statements: 80,
}
```

### Coverage Exclusions

Current exclusions are appropriate:
- `node_modules/`
- `tests/`
- `**/*.d.ts` (type definitions)
- `**/*.config.*` (configuration)
- `**/mockData` (test fixtures)
- `src/types/` (type definitions)

**Consider Adding**:
- `**/*.stories.tsx` (Storybook files, if added)
- `**/index.ts` (barrel exports - low value)

---

## Test Execution Performance

### Current Test Run Times

**Issue**: Tests timing out after 2-5 minutes

**Possible Causes**:
1. Heavy PDF parsing in tests (blocking)
2. Unnecessary file system operations
3. Missing test timeouts
4. Memory leaks in test teardown
5. WSL2 file system performance

**Recommendations**:

1. **Mock Heavy Operations**
   ```typescript
   // Instead of actual PDF parsing
   vi.mock('@/lib/infrastructure/pdf/pdf-processor', () => ({
     parsePDF: vi.fn().mockResolvedValue(mockParsedData)
   }));
   ```

2. **Use Test Timeouts**
   ```typescript
   test('should parse invoice', { timeout: 5000 }, async () => {
     // ...
   });
   ```

3. **Parallel Test Execution**
   ```typescript
   // vitest.config.ts
   test: {
     pool: 'threads',
     poolOptions: {
       threads: {
         singleThread: false,
       },
     },
   }
   ```

4. **Use Docker for Tests** (Faster on WSL2)
   ```bash
   pnpm docker:test    # Already configured ✅
   pnpm docker:type-check  # <10s ✅
   ```

---

## Appendix: Test File Inventory

### Unit Tests (36 files)

**Components** (15+ files):
- `analysis-repository-merge.test.ts`
- `bonus-breakdown.test.ts`
- `components/analysis/*.test.tsx`
- `components/dashboard/*.test.tsx`
- `components/reports/*.test.tsx`
- `components/file-upload.test.tsx`

**Services** (8+ files):
- `file-fingerprint-service.test.ts`
- `services/analysis-service.test.ts`
- `services/payment-calculation.test.ts`
- `services/export-service.test.ts`
- ...

**Hooks** (5+ files):
- `hooks/useAnalysisLoader.test.ts`
- `hooks/useSessionRecovery.test.ts`
- ...

**Domain/Infrastructure** (8+ files):
- `domain/payment-rules.test.ts`
- `infrastructure/pdf-parser.test.ts`
- ...

### Integration Tests (9 files)

**Containers**:
- `containers/Step1Container.test.tsx`

**Pages**:
- `pages/reports-page.test.tsx`
- `pages/settings-page.test.tsx`

**Dashboard**:
- `dashboard/*.test.tsx`

**Critical Fixes**:
- `critical-fixes-integration.test.ts`

### E2E Tests (1 file)

- Location: `tests/e2e/` (1 test file)

---

## Conclusion

### Summary

The Payment Analyzer project has a **solid foundation of component tests** (38 files with 100% coverage) but **critical gaps in infrastructure testing**:

✅ **Strengths**:
- Excellent component test coverage for core features
- Good branch coverage (82%)
- Well-structured test organization
- Comprehensive test suites for file upload and validation

❌ **Weaknesses**:
- No API route testing (0%)
- No utility function testing (0%)
- Minimal page component testing
- Limited integration and E2E tests
- Overall coverage at 32% vs 80% target

### Priority Actions

**This Sprint**:
1. Add API route tests (9 files)
2. Add utility function tests (6 files)
3. Add auth middleware tests

**Next Month**:
4. Increase service coverage to 80%
5. Add critical E2E paths
6. Test page components

**This Quarter**:
7. Achieve 70% overall coverage
8. Add visual regression tests
9. Implement coverage-based CI gates

### Success Metrics

Track these metrics monthly:
- [ ] Lines coverage: 32% → 50% → 70% → 80%
- [ ] API routes coverage: 0% → 80%
- [ ] Utils coverage: 15% → 80%
- [ ] E2E tests: 1 → 10+ critical paths
- [ ] Test execution time: <2 minutes (currently timing out)

---

**Next Review**: November 15, 2025
**Owner**: Development Team
**Related Docs**:
- [Testing Guide](./TESTING.md)
- [CI/CD Guide](./DEV_GUIDE.md)
- [Architecture](./ARCHITECTURE.md)
