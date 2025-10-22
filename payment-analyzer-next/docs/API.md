# REST API Documentation

**Last Updated**: December 2025
**API Version**: v1 (implicit)
**Authentication**: Session-based (Supabase Auth)

---

## API Overview

**Endpoint Count**: 16 HTTP operations across 9 route handlers

**Base URL**: `http://localhost:3000/api` (development)

**Authentication**: Session-based with cookies (Supabase)

**Error Format**:
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "context": {}
  }
}
```

---

## Authentication

All endpoints except `/api/health` require authentication via session cookies.

**Authentication Flow**:
1. User logs in → Supabase creates session
2. Session stored in secure cookies
3. API requests include cookies automatically
4. Middleware validates session

**Rate Limiting**: 100 requests per 15 minutes per user

---

## Endpoints

### 1. Health Check

```http
GET /api/health
```

**Auth**: None (public)

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-12-10T12:00:00.000Z",
  "environment": "production"
}
```

---

### 2. Analysis Management

#### List Analyses

```http
GET /api/analysis?limit=20&offset=0&search=&status=
```

**Query Parameters**:
- `limit` (number): Results per page (default: 20)
- `offset` (number): Skip N results (default: 0)
- `search` (string): Search term
- `status` (string): Filter by status

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "status": "completed",
      "createdAt": "2025-12-01T...",
      "period": { "start": "2025-01-01", "end": "2025-01-31" },
      "totals": { "expectedTotal": 2450.00, "paidTotal": 2450.00 }
    }
  ],
  "pagination": { "limit": 20, "offset": 0, "total": 45 }
}
```

#### Create Analysis (Manual Entry)

```http
POST /api/analysis
Content-Type: application/json

{
  "manualEntries": [
    {
      "date": "2025-01-01",
      "consignments": 50,
      "paid": 150.00,
      "hasUnloadingBonus": false,
      "hasAttendanceBonus": true,
      "hasEarlyBonus": true
    }
  ],
  "paymentRules": {
    "weekdayRate": 2.00,
    "saturdayRate": 3.00
  }
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "analysisId": "uuid",
    "analysis": { /* complete analysis object */ }
  }
}
```

#### Get Single Analysis

```http
GET /api/analysis/{id}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "dailyEntries": [ /* ... */ ],
    "totals": { /* ... */ }
  }
}
```

#### Delete Analysis

```http
DELETE /api/analysis/{id}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Analysis deleted successfully"
}
```

#### Merge Files into Analysis

```http
POST /api/analysis/{id}/merge
Content-Type: application/json

{
  "files": [
    {
      "name": "SELF_BILL_100136037.pdf",
      "type": "invoice",
      "content": "base64-encoded-pdf-content",
      "size": 1024
    }
  ],
  "mergeStrategy": "smart"
}
```

**Purpose**: Merge additional files (runsheet/invoice) into an existing analysis

**Merge Strategies**:
- `smart` (default): Add payments for first invoice, merge subsequent ones intelligently
- `add`: Add new amounts to existing paid amounts
- `replace`: Replace existing amounts with new ones
- `max`: Use the maximum of existing or new amount

**Request Body**:
- `files` (array, required): Array of file objects
  - `name` (string): Original filename
  - `type` (enum): `runsheet` | `invoice`
  - `content` (string): Base64-encoded PDF content
  - `size` (number): File size in bytes (max 10MB)
- `mergeStrategy` (enum, optional): Merge strategy (default: `smart`)

**Response** (200):
```json
{
  "success": true,
  "analysisId": "uuid",
  "message": "Successfully merged 1 file(s). Updated 3 existing entries, created 2 new entries.",
  "updatedTotals": {
    "totalConsignments": 250,
    "totalExpected": 1025.00,
    "totalPaid": 1025.00,
    "totalDifference": 0.00,
    "totalBonuses": 455.00
  }
}
```

**Error Responses**:
- `400`: Invalid request (validation error, file too large, duplicate file)
- `401`: Unauthorized (not authenticated)
- `403`: Forbidden (analysis locked or has error status)
- `404`: Not found (analysis doesn't exist or doesn't belong to user)
- `500`: Server error (processing failed)

**Example Error** (400 - Duplicate File):
```json
{
  "success": false,
  "error": "Duplicate files detected: invoice.pdf. These files have already been processed in this analysis."
}
```

**Security Features**:
- Validates user owns the analysis
- Checks for duplicate files using SHA-256 fingerprints
- Enforces 10MB file size limit
- Validates PDF file type
- Prevents merging into locked/errored analyses

**Use Cases**:
1. **Adding invoice to runsheet-only analysis**: User uploaded runsheet first, now adds matching invoice
2. **Adding runsheet to invoice-only analysis**: User uploaded invoice first, now adds matching runsheet
3. **Correcting data**: User uploads corrected version of runsheet/invoice
4. **Multiple invoices**: Some weeks have multiple payment entries

---

### 3. File Upload (Async)

```http
POST /api/analysis/upload
Content-Type: multipart/form-data

files: [File, File, ...]
paymentRules: '{"weekdayRate": 2.00}'
metadata: '{"description": "Weekly analysis"}'
```

**Response** (202 Accepted):
```json
{
  "success": true,
  "uploadId": "uuid",
  "message": "Upload started. Use uploadId to check progress."
}
```

#### Check Upload Progress

```http
GET /api/analysis/upload?uploadId={id}
```

**Response** (Processing):
```json
{
  "success": true,
  "data": {
    "stage": "processing",
    "progress": 45,
    "message": "Processing file 2 of 3..."
  }
}
```

**Response** (Complete):
```json
{
  "success": true,
  "data": {
    "stage": "completed",
    "progress": 100,
    "result": {
      "analysisId": "uuid",
      "analysis": { /* ... */ }
    }
  }
}
```

---

### 4. Data Export

#### Export Single Analysis

```http
GET /api/export/{id}?format=csv
```

**Query Parameters**:
- `format`: `csv` | `json` (default: `csv`)

**Response**: File download

**CSV Format**:
```csv
Date,Day,Consignments,Rate,Base Payment,Bonus,Total,Paid,Difference
2025-01-01,Monday,45,2.00,90.00,75.00,165.00,165.00,0.00
```

#### Export Multiple Analyses

```http
POST /api/export
Content-Type: application/json

{
  "format": "csv",
  "analysisIds": ["uuid1", "uuid2"],
  "dateRange": {
    "start": "2025-01-01",
    "end": "2025-12-31"
  }
}
```

**Response**: File download

---

### 5. Legacy Data Migration

```http
POST /api/migration
Content-Type: application/json

{
  "version": "v9",
  "data": [
    {
      "period": { "start": "2025-01-01", "end": "2025-01-31" },
      "entries": [ /* ... */ ]
    }
  ]
}
```

**Response** (202):
```json
{
  "success": true,
  "migrationId": "uuid",
  "message": "Migration started",
  "total": 15
}
```

#### Check Migration Progress

```http
GET /api/migration?migrationId={id}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "stage": "processing",
    "progress": 60,
    "processed": 9,
    "total": 15,
    "errors": [],
    "success": ["uuid1", "uuid2"]
  }
}
```

---

### 6. User Preferences

```http
GET /api/preferences
```

**Response**:
```json
{
  "success": true,
  "data": {
    "preferences": {
      "display": { "theme": "dark", "dateFormat": "DD/MM/YYYY" },
      "notifications": { "analysisComplete": true }
    }
  }
}
```

```http
PUT /api/preferences
Content-Type: application/json

{
  "display": {
    "theme": "dark"
  }
}
```

**Response** (200): Updated preferences

---

## Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (async processing) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (not owner) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limit) |
| 500 | Server Error |

### Error Codes

Common error codes:
- `AUTH_UNAUTHORIZED` - Not authenticated
- `AUTH_EMAIL_NOT_VERIFIED` - Email not verified
- `VALIDATION_INVALID_FORMAT` - Invalid input data
- `DATABASE_NOT_FOUND` - Resource not found
- `FILE_TOO_LARGE` - File exceeds 10MB
- `FILE_INVALID_TYPE` - Not a PDF
- `RATE_LIMIT_EXCEEDED` - Too many requests

---

## Testing the API

### Using cURL

```bash
# Health check
curl http://localhost:3000/api/health

# List analyses (with auth cookie)
curl -X GET http://localhost:3000/api/analysis \
  -H "Cookie: sb-access-token=..."

# Create analysis
curl -X POST http://localhost:3000/api/analysis \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=..." \
  -d '{"manualEntries": [{"date": "2025-01-01", "consignments": 50, "paid": 100}]}'
```

### Using JavaScript

```javascript
// Fetch API (cookies included automatically)
const response = await fetch('/api/analysis', {
  credentials: 'include'
});
const { success, data } = await response.json();
```

---

**For More Details:**
- Authentication Setup → [GETTING_STARTED.md](./GETTING_STARTED.md)
- Business Logic → [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md)
