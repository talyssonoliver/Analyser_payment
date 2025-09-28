# GEMINI Project Analysis: payment-analyzer-next

## Project Overview

This project is a modern, scalable, and production-ready version of the "Payment Analyzer Professional" application. It has been migrated from an original monolithic HTML-based system to a robust Next.js application, preserving 100% of the original business logic while introducing significant architectural and technological enhancements.

The application is designed for analyzing payment documents (such as PDF runsheets and invoices) and generating comprehensive financial reports. It is primarily targeted at courier services, delivery companies, and financial analysis professionals.

### Key Technologies

- **Framework**: Next.js 15 (with App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Database**: Supabase (with Row Level Security)
- **State Management**: React Query + Zustand
- **PDF Processing**: PDF.js (with Web Workers)
- **Data Visualization**: Recharts
- **Animations**: Framer Motion

### Architecture

The project follows a Domain-Driven Design (DDD) approach, with a clear separation of concerns between the domain, infrastructure, and application layers. The architecture is designed to be scalable, maintainable, and testable.

- **`src/lib/domain`**: Contains the core business logic, entities, and services.
- **`src/lib/infrastructure`**: Manages external concerns like data access, PDF processing, and external service integrations.
- **`src/components`**: A well-organized library of reusable UI components.
- **`src/app/api`**: A comprehensive REST API for programmatic access to application features.

## Building and Running

### Prerequisites

- Node.js 20+
- pnpm 8+
- A Supabase account

### Setup

1.  **Install dependencies:**
    ```bash
    cd payment-analyzer-next
    pnpm install
    ```

2.  **Configure environment variables:**
    - Copy `.env.example` to `.env.local`.
    - Populate the file with your Supabase URL, keys, and other required credentials.

### Development

-   **Start the development server:**
    ```bash
    pnpm dev
    ```
    This command uses Turbopack for an optimized development experience.

-   **Run type checking:**
    ```bash
    pnpm type-check
    ```

-   **Run linter:**
    ```bash
    pnpm lint
    ```

### Production

-   **Build the application:**
    ```bash
    pnpm build
    ```
    This command uses Turbopack for an optimized production build.

-   **Start the production server:**
    ```bash
    pnpm start
    ```

## Development Conventions

- **Domain-Driven Design**: New features should adhere to the established DDD patterns.
- **TypeScript**: All new code should be written in TypeScript with strict mode enabled.
- **Testing**: The project is set up for unit, integration, and end-to-end testing. New features should include corresponding tests.
- **Conventional Commits**: Commit messages should follow the Conventional Commits specification.
- **API Documentation**: The `API.md` file should be updated to reflect any changes to the REST API.
