-- Payment Analyzer Database Schema
-- This creates all the tables needed for the modern payment analysis system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment rules with versioning
CREATE TABLE IF NOT EXISTS payment_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  weekday_rate DECIMAL(10,2) NOT NULL,
  saturday_rate DECIMAL(10,2) NOT NULL,
  unloading_bonus DECIMAL(10,2) NOT NULL,
  attendance_bonus DECIMAL(10,2) NOT NULL,
  early_bonus DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, version)
);

-- Analysis status enum
CREATE TYPE analysis_status AS ENUM ('pending', 'processing', 'completed', 'error');

-- Analysis source enum  
CREATE TYPE analysis_source AS ENUM ('upload', 'manual', 'import');

-- Main analyses table
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fingerprint TEXT,
  source analysis_source NOT NULL,
  status analysis_status NOT NULL DEFAULT 'pending',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  rules_version INTEGER NOT NULL,
  working_days INTEGER NOT NULL DEFAULT 0,
  total_consignments INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment status enum
CREATE TYPE payment_status AS ENUM ('balanced', 'overpaid', 'underpaid');

-- Daily entries table
CREATE TABLE IF NOT EXISTS daily_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  consignments INTEGER DEFAULT 0 CHECK (consignments >= 0),
  rate DECIMAL(10,2) NOT NULL CHECK (rate >= 0),
  base_payment DECIMAL(10,2) DEFAULT 0 CHECK (base_payment >= 0),
  pickups INTEGER DEFAULT 0 CHECK (pickups >= 0),
  pickup_total DECIMAL(10,2) DEFAULT 0 CHECK (pickup_total >= 0),
  unloading_bonus DECIMAL(10,2) DEFAULT 0 CHECK (unloading_bonus >= 0),
  attendance_bonus DECIMAL(10,2) DEFAULT 0 CHECK (attendance_bonus >= 0),
  early_bonus DECIMAL(10,2) DEFAULT 0 CHECK (early_bonus >= 0),
  expected_total DECIMAL(10,2) NOT NULL CHECK (expected_total >= 0),
  paid_amount DECIMAL(10,2) NOT NULL CHECK (paid_amount >= 0),
  difference DECIMAL(10,2) NOT NULL,
  status payment_status NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(analysis_id, date)
);

-- Analysis totals (computed/cached values)
CREATE TABLE IF NOT EXISTS analysis_totals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE UNIQUE NOT NULL,
  base_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  pickup_total DECIMAL(10,2) DEFAULT 0,
  bonus_total DECIMAL(10,2) DEFAULT 0,
  expected_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  difference_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- File types enum
CREATE TYPE file_type AS ENUM ('runsheet', 'invoice', 'other');

-- Analysis files table (for uploaded PDFs)
CREATE TABLE IF NOT EXISTS analysis_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  file_hash TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_type file_type NOT NULL,
  parsed_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions for recovery
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recovery_data JSONB,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_payment_rules_user_active ON payment_rules(user_id, is_active, valid_from DESC);
CREATE INDEX idx_analyses_user_created ON analyses(user_id, created_at DESC);
CREATE INDEX idx_analyses_fingerprint ON analyses(fingerprint) WHERE fingerprint IS NOT NULL;
CREATE INDEX idx_analyses_period ON analyses(period_start, period_end);
CREATE INDEX idx_daily_entries_analysis_date ON daily_entries(analysis_id, date);
CREATE INDEX idx_daily_entries_date_status ON daily_entries(date, status);
CREATE INDEX idx_analysis_files_analysis ON analysis_files(analysis_id);
CREATE INDEX idx_analysis_files_hash ON analysis_files(file_hash);
CREATE INDEX idx_user_sessions_user_activity ON user_sessions(user_id, last_activity DESC);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_totals ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payment rules policies
CREATE POLICY "Users can view their own payment rules" ON payment_rules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own payment rules" ON payment_rules
  FOR ALL USING (auth.uid() = user_id);

-- Analyses policies
CREATE POLICY "Users can view their own analyses" ON analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own analyses" ON analyses
  FOR ALL USING (auth.uid() = user_id);

-- Daily entries policies (through analyses)
CREATE POLICY "Users can view daily entries for their analyses" ON daily_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM analyses 
      WHERE analyses.id = daily_entries.analysis_id 
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage daily entries for their analyses" ON daily_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM analyses 
      WHERE analyses.id = daily_entries.analysis_id 
      AND analyses.user_id = auth.uid()
    )
  );

-- Analysis totals policies (through analyses)
CREATE POLICY "Users can view totals for their analyses" ON analysis_totals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM analyses 
      WHERE analyses.id = analysis_totals.analysis_id 
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage totals for their analyses" ON analysis_totals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM analyses 
      WHERE analyses.id = analysis_totals.analysis_id 
      AND analyses.user_id = auth.uid()
    )
  );

-- Analysis files policies (through analyses)
CREATE POLICY "Users can view files for their analyses" ON analysis_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM analyses 
      WHERE analyses.id = analysis_files.analysis_id 
      AND analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage files for their analyses" ON analysis_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM analyses 
      WHERE analyses.id = analysis_files.analysis_id 
      AND analyses.user_id = auth.uid()
    )
  );

-- User sessions policies
CREATE POLICY "Users can view their own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions" ON user_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Functions and triggers

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE OR REPLACE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payment_rules_updated_at
  BEFORE UPDATE ON payment_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_analyses_updated_at
  BEFORE UPDATE ON analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();