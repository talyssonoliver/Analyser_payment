# Payment Analyzer Next - Documentation Index

**Last Updated**: December 2025
**Target Audience**: All AI Assistants (Claude, Gemini, etc.) and Human Developers
**Project Status**: Production-Ready Enterprise Application

---

## 🎯 Quick Start

**New to the project?** Start here:

1. **[GETTING_STARTED.md](./GETTING_STARTED.md)** - Setup guide (Docker recommended)
2. **[DEV_GUIDE.md](./DEV_GUIDE.md)** - Development workflow and commands
3. **[CONVENTIONS.md](./CONVENTIONS.md)** - Code standards and patterns

**Looking for specific information?** Jump to:
- **Architecture** → [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Docker Setup** → [DOCKER.md](./DOCKER.md)
- **API Documentation** → [API.md](./API.md)
- **Business Rules** → [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md)
- **Testing** → [TESTING.md](./TESTING.md)

---

## 📚 Complete Documentation

### 🚀 Getting Started
- **[GETTING_STARTED.md](./GETTING_STARTED.md)** - Complete setup guide
  - Prerequisites (Node.js 20+, pnpm 8+, Docker)
  - Installation steps (Docker-first approach)
  - Environment configuration
  - First-time setup troubleshooting
  - Traditional setup (no Docker)

### 💻 Development
- **[DEV_GUIDE.md](./DEV_GUIDE.md)** - Day-to-day development
  - Development workflows (Docker and traditional)
  - Common tasks and commands
  - Database management
  - Hot reload and debugging
  - Git workflow

- **[DOCKER.md](./DOCKER.md)** - Docker development environment
  - Why Docker? (60s+ → <10s type-check performance)
  - Architecture and services
  - Volume strategy for performance
  - Docker commands reference
  - Troubleshooting common issues

- **[CONVENTIONS.md](./CONVENTIONS.md)** - Code standards and patterns
  - File naming conventions
  - Component patterns
  - Styling approach (Tailwind-first)
  - Import organization
  - Git commit conventions
  - ESLint and TypeScript rules

### 🏗️ Architecture
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design and patterns
  - Domain-Driven Design (DDD) implementation
  - Directory structure (238 source files)
  - Layer separation (domain, infrastructure, UI)
  - Key architectural decisions
  - Technology stack (Next.js 15, React 19, TypeScript 5.9)

- **[BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md)** - Payment rules and calculations
  - Payment rates (£2.00 weekday, £3.00 Saturday)
  - Bonus structure (£30 unloading, £25 attendance, £50 early)
  - Day-of-week eligibility rules
  - Calculation workflows
  - PDF processing patterns
  - Domain entities and value objects

### 📡 API & Integration
- **[API.md](./API.md)** - REST API documentation
  - 16 HTTP operations across 9 route handlers
  - Authentication (session-based with Supabase)
  - Analysis CRUD endpoints
  - File upload and processing
  - Data export (CSV, JSON, PDF-ready)
  - Migration API for legacy data
  - Error handling and status codes

### 🧪 Testing
- **[TESTING.md](./TESTING.md)** - Testing infrastructure
  - Test frameworks (Vitest 3.2, Playwright 1.55)
  - 2,116 tests across 45 test files
  - Unit, integration, and E2E strategies
  - Running tests (Docker and traditional)
  - Coverage targets (75%+ overall)
  - Writing new tests

### 🔒 Security & Compliance
- **[AUDIT_README.md](./AUDIT_README.md)** - Security audit navigation guide ⭐ START HERE
- **[AUDIT_EXECUTIVE_SUMMARY.md](./AUDIT_EXECUTIVE_SUMMARY.md)** - High-level audit findings (10 min read)
  - 4 CRITICAL issues requiring immediate attention
  - Security grade: B (Good but needs fixes)
  - Estimated remediation: 7-9 days
- **[SECURITY_AUDIT_REPORT.json](./SECURITY_AUDIT_REPORT.json)** - Complete technical findings
  - 32 total issues with CVSS scores
  - Line-by-line remediation guidance
  - Compliance impact assessment
- **[SECURITY_AUDIT_FINDINGS.csv](./SECURITY_AUDIT_FINDINGS.csv)** - Issue tracking spreadsheet
  - Filter by severity, category, status
  - Track remediation progress
- **[AUTOMATED_REMEDIATION.sh](./AUTOMATED_REMEDIATION.sh)** - Automated fix script
  - Fixes 18 of 32 issues automatically
  - Safe dry-run mode available
  - Run: `bash docs/AUTOMATED_REMEDIATION.sh`
- **[SOC2_ISO27001_COMPLIANCE_ASSESSMENT.md](./SOC2_ISO27001_COMPLIANCE_ASSESSMENT.md)** - Compliance roadmap
  - SOC 2 Trust Services Criteria analysis
  - ISO 27001 control mapping
  - 6-8 week timeline to certification readiness

---

## 📁 Project Structure Overview

```
payment-analyzer-next/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── (dashboard)/        # Protected routes
│   │   └── api/                # REST API (9 route handlers)
│   ├── components/             # 116 React components
│   │   ├── ui/                 # 20+ base components
│   │   ├── analysis/           # Analysis workflow
│   │   └── dashboard/          # Dashboard features
│   ├── lib/                    # Business logic (72 files)
│   │   ├── domain/             # DDD core (entities, services, value objects)
│   │   ├── infrastructure/     # PDF processing, repositories
│   │   └── services/           # 15 application services
│   └── hooks/                  # 17 custom React hooks
├── tests/                      # 45 test files, 2,116 tests
├── docs/                       # 📍 YOU ARE HERE
├── supabase/                   # Database migrations (11 files)
└── docker-compose.dev.yml      # Docker development setup
```

---

## 🎓 Learning Path

### For AI Assistants

**First-time working with this project?**
1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand the system design
2. Read [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) - Learn payment calculation rules
3. Read [CONVENTIONS.md](./CONVENTIONS.md) - Follow code standards
4. Refer to [DEV_GUIDE.md](./DEV_GUIDE.md) - For commands and workflows

**Working on specific features?**
- **PDF Processing** → [BUSINESS_LOGIC.md § PDF Processing](./BUSINESS_LOGIC.md#pdf-processing-patterns)
- **API Development** → [API.md](./API.md)
- **Component Development** → [CONVENTIONS.md § Component Patterns](./CONVENTIONS.md#component-patterns)
- **Database Changes** → [DEV_GUIDE.md § Database](./DEV_GUIDE.md#database-management)

### For Human Developers

**Junior Developers:**
1. [GETTING_STARTED.md](./GETTING_STARTED.md) - Set up environment
2. [DEV_GUIDE.md](./DEV_GUIDE.md) - Learn daily workflows
3. [CONVENTIONS.md](./CONVENTIONS.md) - Code style guide
4. [TESTING.md](./TESTING.md) - Write tests

**Senior Developers:**
1. [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
2. [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) - Domain knowledge
3. [API.md](./API.md) - API reference
4. [C4-ARCHITECTURE-MODEL.md](./C4-ARCHITECTURE-MODEL.md) - Architecture diagrams

---

## 🔍 Find Documentation By Topic

| Topic | Documentation | Section |
|-------|---------------|---------|
| **Setup & Installation** | [GETTING_STARTED.md](./GETTING_STARTED.md) | Full guide |
| **Docker Development** | [DOCKER.md](./DOCKER.md) | Complete Docker docs |
| **Daily Commands** | [DEV_GUIDE.md](./DEV_GUIDE.md) | Command reference |
| **Payment Calculations** | [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) | § Calculation Workflows |
| **Bonus Rules** | [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) | § Bonus Structure |
| **PDF Parsing** | [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) | § PDF Processing |
| **REST API** | [API.md](./API.md) | Complete API docs |
| **File Upload** | [API.md](./API.md) | § File Upload & Processing |
| **Data Export** | [API.md](./API.md) | § Data Export |
| **Testing** | [TESTING.md](./TESTING.md) | Complete testing guide |
| **Code Style** | [CONVENTIONS.md](./CONVENTIONS.md) | Full style guide |
| **Commit Standards** | [CONVENTIONS.md](./CONVENTIONS.md) | § Commit Conventions |
| **TypeScript Config** | [CONVENTIONS.md](./CONVENTIONS.md) | § TypeScript Configuration |
| **Component Patterns** | [CONVENTIONS.md](./CONVENTIONS.md) | § Component Patterns |
| **DDD Architecture** | [ARCHITECTURE.md](./ARCHITECTURE.md) | § Domain-Driven Design |
| **Database Schema** | [ARCHITECTURE.md](./ARCHITECTURE.md) | § Database Schema |
| **Technology Stack** | [ARCHITECTURE.md](./ARCHITECTURE.md) | § Key Technologies |
| **Security Audit** | [AUDIT_README.md](./AUDIT_README.md) | Complete audit documentation |
| **Security Fixes** | [AUTOMATED_REMEDIATION.sh](./AUTOMATED_REMEDIATION.sh) | Automated remediation script |
| **Compliance** | [SOC2_ISO27001_COMPLIANCE_ASSESSMENT.md](./SOC2_ISO27001_COMPLIANCE_ASSESSMENT.md) | SOC 2 & ISO 27001 |

---

## 📖 Historical Documentation (Archive)

Implementation reports and historical documentation have been moved to:
- **[archive/](./archive/)** - Implementation reports, refactoring summaries, fix reports

These documents provide historical context but are not required reading for current development.

---

## 🆘 Quick Help

### Common Questions

**Q: How do I start the development server?**
A: Use `pnpm docker:dev` (recommended) or `pnpm dev` (traditional). See [DEV_GUIDE.md](./DEV_GUIDE.md).

**Q: How do I run tests?**
A: Use `pnpm docker:test` or `pnpm test`. See [TESTING.md](./TESTING.md).

**Q: How do payment bonuses work?**
A: See [BUSINESS_LOGIC.md § Bonus Structure](./BUSINESS_LOGIC.md#bonus-structure).

**Q: Where is the API documentation?**
A: See [API.md](./API.md) for complete REST API reference.

**Q: How do I contribute code?**
A: Follow standards in [CONVENTIONS.md](./CONVENTIONS.md) and workflows in [DEV_GUIDE.md](./DEV_GUIDE.md).

### Getting Unstuck

- **Environment Issues** → [GETTING_STARTED.md § Troubleshooting](./GETTING_STARTED.md#troubleshooting)
- **Docker Problems** → [DOCKER.md § Troubleshooting](./DOCKER.md#troubleshooting-guide)
- **Test Failures** → [TESTING.md § Debugging Tests](./TESTING.md#debugging-tests)
- **Type Errors** → Run `pnpm docker:type-check` and see [CONVENTIONS.md § TypeScript](./CONVENTIONS.md#typescript-configuration)

---

## 📝 Documentation Standards

All documentation in this project follows these principles:

1. **Single Source of Truth** - Each concept documented in ONE place, referenced elsewhere
2. **AI-Friendly** - Clear structure, explicit examples, comprehensive details
3. **Human-Friendly** - Quick reference sections, visual diagrams where helpful
4. **Up-to-Date** - Last updated dates at top of each file
5. **Cross-Referenced** - Links between related documentation
6. **Versioned** - Tracked in git, updated with code changes

---

## 🤝 Contributing to Documentation

Found outdated information? Want to improve documentation?

1. Update the relevant `.md` file in `docs/`
2. Update "Last Updated" date at top of file
3. Ensure cross-references still work
4. Commit with message: `docs: update [FILE] - [BRIEF DESCRIPTION]`
5. Create PR with documentation label

---

## 📞 Need Help?

- **Technical Questions** → Review architecture and conventions docs
- **Bug Reports** → Check GitHub Issues
- **Feature Requests** → See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **General Discussion** → Team communication channels

---

**Welcome to Payment Analyzer Next!** This is a production-ready, enterprise-grade application built with modern best practices. Enjoy exploring the codebase! 🚀
