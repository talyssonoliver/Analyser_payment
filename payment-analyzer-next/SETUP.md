# Payment Analyzer Setup Guide

This guide will help you set up the Payment Analyzer application with all required services.

## Prerequisites

- Node.js 18+ installed
- pnpm package manager installed (`npm install -g pnpm`)
- Supabase account (free tier works)

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone [your-repo-url]
cd payment-analyzer-next

# Install dependencies (MUST use pnpm)
pnpm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Copy the example file
cp .env.example .env.local
```

### 3. Supabase Setup

1. **Create a Supabase Project**
   - Go to [https://supabase.com](https://supabase.com)
   - Create a new project
   - Wait for it to be provisioned

2. **Get Your API Keys**
   - In your Supabase dashboard, go to Settings > API
   - Copy the following values:
     - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
     - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

3. **Update `.env.local`**
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

   # Database URL (from Supabase dashboard > Settings > Database)
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres
   ```

### 4. Database Setup

Run the database migrations:

```bash
# Run migrations to create tables
pnpm db:migrate

# (Optional) Seed with test data
pnpm db:seed
```

### 5. Start Development Server

```bash
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Running Without Supabase (Demo Mode)

If you want to run the application without setting up Supabase:

1. The app will automatically fall back to local storage
2. Authentication features will be disabled
3. Data will only persist in your browser

## Troubleshooting

### "Failed to fetch" Error

This usually means your Supabase environment variables are not set correctly:

1. Check that `.env.local` exists and contains all required variables
2. Restart your development server after adding environment variables
3. Verify your Supabase project is active (not paused)

### Database Connection Issues

1. Ensure your Supabase project is not paused
2. Check that your database password is correct
3. Verify Row Level Security (RLS) is properly configured

### Build Errors

Always use `pnpm` for all operations:
```bash
pnpm install  # NOT npm install
pnpm dev      # NOT npm run dev
pnpm build    # NOT npm run build
```

## Production Deployment

For production deployment:

1. Set all environment variables in your hosting platform
2. Run `pnpm build` to create production build
3. Ensure database migrations are run on production database

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Project README](./README.md)