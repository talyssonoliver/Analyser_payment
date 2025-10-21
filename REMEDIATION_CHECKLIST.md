# Security Remediation Checklist

Based on the security audit conducted on 2025-10-21, this checklist provides actionable steps to remediate identified vulnerabilities.

## Phase 1: Immediate Actions (0-7 days) - CRITICAL

### ✅ VUL-001: Add Subresource Integrity (SRI)

**Estimated Effort:** 2 hours
**Priority:** IMMEDIATE

- [ ] Generate SRI hash for pdf.js:
  ```bash
  curl -s https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js | \
    openssl dgst -sha384 -binary | openssl base64 -A
  ```

- [ ] Generate SRI hash for lz-string:
  ```bash
  curl -s https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js | \
    openssl dgst -sha384 -binary | openssl base64 -A
  ```

- [ ] Update HTML file (Line 10):
  ```html
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
          integrity="sha384-[YOUR-HASH-HERE]"
          crossorigin="anonymous"></script>
  ```

- [ ] Update HTML file (Line 11):
  ```html
  <script src="https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js"
          integrity="sha384-[YOUR-HASH-HERE]"
          crossorigin="anonymous"></script>
  ```

- [ ] Update worker source (Line 3533):
  ```javascript
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  // Note: Workers loaded via workerSrc don't support SRI
  // Consider self-hosting or using importScripts with SRI
  ```

- [ ] Test application functionality after changes
- [ ] Verify SRI hashes are correct

**Verification:**
```bash
# Check SRI implementation
grep -n "integrity=" payment-analyzer-multipage.v9.0.0.html
```

---

### ✅ VUL-002: Update Dependencies

**Estimated Effort:** 4 hours
**Priority:** HIGH

- [ ] Check latest pdf.js version:
  ```bash
  # Visit: https://github.com/mozilla/pdf.js/releases
  # Current: 3.11.174
  # Latest: [CHECK]
  ```

- [ ] Check for known vulnerabilities:
  ```bash
  # Search CVE databases for pdf.js vulnerabilities
  # Check: https://cve.mitre.org/
  ```

- [ ] Update to latest stable version if available

- [ ] Set up Dependabot:
  - [ ] Create `.github/dependabot.yml`
  - [ ] Configure for weekly checks
  - [ ] Add security reviewers

- [ ] Subscribe to security advisories:
  - [ ] pdf.js: https://github.com/mozilla/pdf.js/security/advisories
  - [ ] lz-string: https://github.com/pieroxy/lz-string/security/advisories

**Verification:**
```bash
# Document current versions
echo "pdf.js: 3.11.174" > dependencies.txt
echo "lz-string: 1.5.0" >> dependencies.txt
```

---

### ✅ Add Basic CSP

**Estimated Effort:** 2 hours
**Priority:** IMMEDIATE

- [ ] Add CSP meta tag to HTML (after Line 8):
  ```html
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' https://cdnjs.cloudflare.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data:;
    object-src 'none';
    base-uri 'self';
  ">
  ```

- [ ] Test application with CSP enabled

- [ ] **Known Issue:** CSP will block `new Function()` used in module loader
  - [ ] Document this limitation
  - [ ] Plan refactoring in Phase 2

**Verification:**
```bash
# Check CSP implementation
grep -n "Content-Security-Policy" payment-analyzer-multipage.v9.0.0.html
```

---

## Phase 2: High Priority (7-30 days)

### ✅ SEC-001: Refactor Module System

**Estimated Effort:** 16 hours
**Priority:** HIGH

- [ ] Analyze current module system
  - [ ] Document all modules used
  - [ ] Map dependencies between modules

- [ ] **Option A: Convert to ES6 Modules**
  - [ ] Split into separate .js files
  - [ ] Use `<script type="module">`
  - [ ] Update imports/exports

- [ ] **Option B: Add Module Validation (interim solution)**
  - [ ] Whitelist allowed modules
  - [ ] Add content validation
  - [ ] Implement integrity checks

- [ ] Remove `new Function()` usage:
  - [ ] Line 6584: Remove or replace
  - [ ] Line 6591: Remove or replace

- [ ] Update CSP to strict mode (remove 'unsafe-eval' equivalents)

- [ ] Test all functionality after refactoring

**Modules to refactor:**
- routerModule
- stateModule
- parserModule
- rulesModule
- uiModule
- appModule

---

### ✅ SEC-002: Fix XSS Vulnerabilities

**Estimated Effort:** 24 hours
**Priority:** HIGH

**Step 1: Install DOMPurify**

- [ ] Add DOMPurify library:
  ```html
  <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"
          integrity="sha384-[HASH]"
          crossorigin="anonymous"></script>
  ```

**Step 2: Replace innerHTML - Priority Locations**

- [ ] Line 4547, 4550: File list rendering
  ```javascript
  // BEFORE:
  fileList.innerHTML = '';

  // AFTER:
  while (fileList.firstChild) {
    fileList.removeChild(fileList.firstChild);
  }
  ```

- [ ] Line 4570: File item rendering
  ```javascript
  // BEFORE:
  div.innerHTML = `<div class="file-name">${safeName}</div>...`;

  // AFTER:
  const nameDiv = document.createElement('div');
  nameDiv.className = 'file-name';
  nameDiv.textContent = file.name;  // Auto-escapes
  div.appendChild(nameDiv);
  ```

- [ ] Line 4700: Table row rendering
- [ ] Line 4755: History list rendering
- [ ] Line 6317, 6612, 6696: Error message rendering

**Step 3: Improve Sanitization**

- [ ] Replace basic sanitization (Lines 4567-4568):
  ```javascript
  // BEFORE:
  const safeName = file.name.replace(/[<>]/g, '');

  // AFTER:
  const safeName = DOMPurify.sanitize(file.name, {
    ALLOWED_TAGS: [],  // Strip all HTML
    ALLOWED_ATTR: []
  });
  ```

**Step 4: Create Safe Templating Helpers**

- [ ] Add safe HTML creation utilities:
  ```javascript
  function createElement(tag, className, textContent) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (textContent) el.textContent = textContent;
    return el;
  }

  function sanitizeHTML(html) {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'div'],
      ALLOWED_ATTR: ['class']
    });
  }
  ```

**Verification:**
```bash
# Count remaining innerHTML usage (should be <5)
grep -n "innerHTML" payment-analyzer-multipage.v9.0.0.html | wc -l
```

---

### ✅ SEC-003: Complete Security Headers

**Estimated Effort:** 4 hours
**Priority:** MEDIUM

- [ ] Add all security headers:
  ```html
  <!-- Prevent clickjacking -->
  <meta http-equiv="X-Frame-Options" content="DENY">

  <!-- Prevent MIME sniffing -->
  <meta http-equiv="X-Content-Type-Options" content="nosniff">

  <!-- Referrer policy -->
  <meta name="referrer" content="no-referrer">

  <!-- Permissions policy -->
  <meta http-equiv="Permissions-Policy" content="geolocation=(), microphone=(), camera=()">
  ```

- [ ] If deploying to web server, configure HTTP headers:
  - [ ] Apache: Update .htaccess
  - [ ] Nginx: Update nginx.conf
  - [ ] Other: Configure appropriately

**Verification:**
```bash
# Check headers in browser DevTools > Network > Headers
# Or use: https://securityheaders.com/
```

---

## Phase 3: Medium Priority (30-60 days)

### ✅ SEC-004: Implement Data Encryption

**Estimated Effort:** 40 hours
**Priority:** MEDIUM

**Step 1: Add Web Crypto API Encryption**

- [ ] Create encryption module:
  ```javascript
  async function encryptData(data, password) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));

    const keyMaterial = await crypto.subtle.importKey(
      "raw", enc.encode(password), "PBKDF2", false,
      ["deriveBits", "deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      enc.encode(JSON.stringify(data))
    );

    return {
      salt: Array.from(salt),
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    };
  }
  ```

- [ ] Create decryption function

- [ ] Update storage functions (Lines 3690, 3698, 3844)

- [ ] Add password/PIN prompt for users

- [ ] Handle encryption errors gracefully

**Step 2: Add Session Timeout**

- [ ] Implement 30-minute timeout:
  ```javascript
  const SESSION_TIMEOUT = 30 * 60 * 1000;

  function setupSessionTimeout() {
    let timeoutId;
    function resetTimeout() {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        State.clear();
        alert('Session expired for security');
        location.reload();
      }, SESSION_TIMEOUT);
    }

    ['mousedown', 'keydown', 'scroll', 'touchstart']
      .forEach(e => document.addEventListener(e, resetTimeout));
    resetTimeout();
  }
  ```

**Step 3: Add Data Retention Policy**

- [ ] Auto-delete analyses older than 90 days:
  ```javascript
  function cleanOldAnalyses() {
    const analyses = State.getAllAnalyses();
    const cutoffDate = Date.now() - (90 * 24 * 60 * 60 * 1000);

    Object.entries(analyses).forEach(([id, analysis]) => {
      if (new Date(analysis.created) < cutoffDate) {
        delete analyses[id];
      }
    });

    localStorage.setItem(ANALYSES_KEY, JSON.stringify(analyses));
  }
  ```

- [ ] Run cleanup on app startup
- [ ] Add manual cleanup button

**Verification:**
- [ ] Test encryption/decryption
- [ ] Verify session timeout works
- [ ] Confirm old data is deleted

---

### ✅ SEC-005: File Validation

**Estimated Effort:** 16 hours
**Priority:** LOW-MEDIUM

- [ ] Add comprehensive validation function:
  ```javascript
  async function validateFile(file) {
    // 1. Size check
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      throw new Error('File too large');
    }

    // 2. MIME type check
    if (file.type !== 'application/pdf') {
      throw new Error('Invalid file type');
    }

    // 3. Magic number check
    const header = await file.slice(0, 5).arrayBuffer();
    const bytes = new Uint8Array(header);
    const pdfSig = [0x25, 0x50, 0x44, 0x46, 0x2D]; // "%PDF-"

    if (!pdfSig.every((b, i) => b === bytes[i])) {
      throw new Error('Not a valid PDF');
    }

    // 4. Sanitize filename
    return file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 255);
  }
  ```

- [ ] Update file upload handler to use validation

- [ ] Add user-friendly error messages

- [ ] Test with various file types

**Verification:**
- [ ] Test with non-PDF files (should reject)
- [ ] Test with >10MB files (should reject)
- [ ] Test with malicious filenames (should sanitize)

---

### ✅ CODE-001: Fix Line Endings

**Estimated Effort:** 2 hours
**Priority:** LOW

- [ ] Convert file to LF:
  ```bash
  dos2unix payment-analyzer-multipage.v9.0.0.html
  # OR
  sed -i 's/\r$//' payment-analyzer-multipage.v9.0.0.html
  ```

- [ ] Verify .gitattributes exists (already created)

- [ ] Normalize repository:
  ```bash
  git add --renormalize .
  git commit -m "Normalize line endings to LF"
  ```

**Verification:**
```bash
file payment-analyzer-multipage.v9.0.0.html
# Should NOT show "CRLF"
```

---

## Phase 4: Low Priority (60-90 days)

### ✅ CODE-002: Format Code

**Estimated Effort:** 4 hours
**Priority:** LOW

- [ ] Install Prettier:
  ```bash
  npm install -g prettier
  ```

- [ ] Create .prettierrc:
  ```json
  {
    "printWidth": 100,
    "tabWidth": 2,
    "useTabs": false,
    "semi": true,
    "singleQuote": true
  }
  ```

- [ ] Format file:
  ```bash
  prettier --write payment-analyzer-multipage.v9.0.0.html
  ```

- [ ] Review changes and commit

---

### ✅ Automated Security Testing

**Estimated Effort:** 16 hours
**Priority:** MEDIUM

**Step 1: GitHub Actions Security Workflow**

- [ ] Create `.github/workflows/security-scan.yml`
- [ ] Add Trivy scanner
- [ ] Add secret scanning (TruffleHog)
- [ ] Configure SARIF upload to GitHub Security

**Step 2: Pre-commit Hooks**

- [ ] Install pre-commit framework
- [ ] Create `.pre-commit-config.yaml` (already created)
- [ ] Add hooks:
  - [ ] check-added-large-files
  - [ ] detect-secrets
  - [ ] forbid-crlf
  - [ ] ESLint security

**Step 3: ESLint Security**

- [ ] Install ESLint with security plugins
- [ ] Create `.eslintrc.json`
- [ ] Configure security rules
- [ ] Run initial scan

**Verification:**
```bash
# Run all checks
pre-commit run --all-files
```

---

## Testing Checklist

After each phase, perform these tests:

### Functional Testing
- [ ] Upload runsheet PDF
- [ ] Upload invoice PDF
- [ ] Generate analysis
- [ ] View reports
- [ ] Export data
- [ ] Clear data
- [ ] Verify localStorage operations

### Security Testing
- [ ] Test XSS payloads in filenames
- [ ] Test large file uploads
- [ ] Test non-PDF file uploads
- [ ] Verify CSP blocks unsafe scripts
- [ ] Verify SRI blocks tampered scripts
- [ ] Test session timeout
- [ ] Test data encryption/decryption

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Progress Tracking

| Finding ID | Status | Assigned To | Target Date | Completed Date |
|------------|--------|-------------|-------------|----------------|
| VUL-001    | ⬜ TODO | - | - | - |
| VUL-002    | ⬜ TODO | - | - | - |
| SEC-001    | ⬜ TODO | - | - | - |
| SEC-002    | ⬜ TODO | - | - | - |
| SEC-003    | ⬜ TODO | - | - | - |
| SEC-004    | ⬜ TODO | - | - | - |
| SEC-005    | ⬜ TODO | - | - | - |
| CODE-001   | ⬜ TODO | - | - | - |
| CODE-002   | ⬜ TODO | - | - | - |

**Status Legend:**
- ⬜ TODO
- 🟡 IN PROGRESS
- ✅ COMPLETED
- ❌ BLOCKED

---

## Sign-off

Upon completion of all remediation tasks:

- [ ] All critical findings resolved
- [ ] All high findings resolved
- [ ] Security tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Stakeholders notified
- [ ] Follow-up audit scheduled

**Remediation Lead:** _________________
**Date:** _________________

**Security Reviewer:** _________________
**Date:** _________________

---

**Last Updated:** 2025-10-21
**Next Review:** 30 days post-completion
