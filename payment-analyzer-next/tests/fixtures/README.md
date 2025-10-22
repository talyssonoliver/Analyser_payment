# Test Fixtures

This directory contains test data fixtures and sample files.

## Structure

- **pdfs/** - Sample PDF files for testing
  - runsheet-samples/
  - invoice-samples/

- **mock-data/** - JSON mock data files
  - analyses.json
  - daily-entries.json
  - payment-rules.json

## Usage

```typescript
import mockAnalyses from '@/tests/fixtures/mock-data/analyses.json';
```

## Guidelines

- Keep fixtures minimal but representative
- Document the purpose of each fixture
- Use realistic data that matches production patterns
- Update fixtures when business rules change
