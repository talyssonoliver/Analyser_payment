-- Add support for updating analyses with new files and tracking entry history

-- 1. Add update tracking fields to analyses table
ALTER TABLE analyses 
ADD COLUMN IF NOT EXISTS last_updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS update_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;

-- 2. Create entry history table for audit trail
CREATE TABLE IF NOT EXISTS daily_entry_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_entry_id uuid NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Snapshot of the entry at this point in time
  date date NOT NULL,
  consignments integer NOT NULL DEFAULT 0,
  expected_amount decimal(10,2) NOT NULL DEFAULT 0,
  paid_amount decimal(10,2) NOT NULL DEFAULT 0,
  difference decimal(10,2) NOT NULL DEFAULT 0,
  
  -- Bonus snapshot
  unloading_bonus boolean DEFAULT false,
  attendance_bonus boolean DEFAULT false,
  early_bonus boolean DEFAULT false,
  
  -- Change metadata
  change_type text NOT NULL CHECK (change_type IN ('created', 'updated_runsheet', 'updated_invoice', 'manual_edit')),
  change_source text CHECK (change_source IN ('file_upload', 'manual_entry', 'api')),
  file_name text,
  previous_values jsonb,
  
  created_at timestamptz DEFAULT now()
);

-- 3. Add merge strategy field to track how payments should be handled
ALTER TABLE daily_entries
ADD COLUMN IF NOT EXISTS payment_merge_strategy text DEFAULT 'add' CHECK (payment_merge_strategy IN ('add', 'replace', 'max'));

-- 4. Create file processing log to track what files have been processed
CREATE TABLE IF NOT EXISTS analysis_file_processing_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES analysis_files(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  file_type text NOT NULL,
  processed_at timestamptz DEFAULT now(),
  entries_affected integer DEFAULT 0,
  processing_notes jsonb
);

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_entry_history_entry_id ON daily_entry_history(daily_entry_id);
CREATE INDEX IF NOT EXISTS idx_daily_entry_history_analysis_id ON daily_entry_history(analysis_id);
CREATE INDEX IF NOT EXISTS idx_daily_entry_history_created_at ON daily_entry_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_processing_log_analysis_id ON analysis_file_processing_log(analysis_id);

-- 6. Create function to log entry changes
CREATE OR REPLACE FUNCTION log_daily_entry_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user_id from the analysis
  SELECT user_id INTO v_user_id FROM analyses WHERE id = NEW.analysis_id;
  
  -- For new entries
  IF TG_OP = 'INSERT' THEN
    INSERT INTO daily_entry_history (
      daily_entry_id, analysis_id, user_id,
      date, consignments, expected_amount, paid_amount, difference,
      unloading_bonus, attendance_bonus, early_bonus,
      change_type, change_source
    ) VALUES (
      NEW.id, NEW.analysis_id, v_user_id,
      NEW.date, NEW.consignments, NEW.expected_amount, NEW.paid_amount, NEW.difference,
      NEW.unloading_bonus, NEW.attendance_bonus, NEW.early_bonus,
      'created', 'file_upload'
    );
  
  -- For updates
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log if key fields changed
    IF OLD.consignments != NEW.consignments OR 
       OLD.paid_amount != NEW.paid_amount OR
       OLD.expected_amount != NEW.expected_amount THEN
      
      INSERT INTO daily_entry_history (
        daily_entry_id, analysis_id, user_id,
        date, consignments, expected_amount, paid_amount, difference,
        unloading_bonus, attendance_bonus, early_bonus,
        change_type, change_source,
        previous_values
      ) VALUES (
        NEW.id, NEW.analysis_id, v_user_id,
        NEW.date, NEW.consignments, NEW.expected_amount, NEW.paid_amount, NEW.difference,
        NEW.unloading_bonus, NEW.attendance_bonus, NEW.early_bonus,
        CASE 
          WHEN OLD.consignments != NEW.consignments THEN 'updated_runsheet'
          WHEN OLD.paid_amount != NEW.paid_amount THEN 'updated_invoice'
          ELSE 'manual_edit'
        END,
        'file_upload',
        jsonb_build_object(
          'consignments', OLD.consignments,
          'expected_amount', OLD.expected_amount,
          'paid_amount', OLD.paid_amount,
          'difference', OLD.difference
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger for history tracking
DROP TRIGGER IF EXISTS daily_entry_history_trigger ON daily_entries;
CREATE TRIGGER daily_entry_history_trigger
AFTER INSERT OR UPDATE ON daily_entries
FOR EACH ROW EXECUTE FUNCTION log_daily_entry_change();

-- 8. Function to update analysis timestamp
CREATE OR REPLACE FUNCTION update_analysis_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE analyses 
  SET last_updated_at = now(),
      update_count = update_count + 1
  WHERE id = NEW.analysis_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Trigger to update analysis when entries change
DROP TRIGGER IF EXISTS update_analysis_timestamp_trigger ON daily_entries;
CREATE TRIGGER update_analysis_timestamp_trigger
AFTER INSERT OR UPDATE ON daily_entries
FOR EACH ROW EXECUTE FUNCTION update_analysis_timestamp();

-- 10. RLS Policies for new tables
ALTER TABLE daily_entry_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_file_processing_log ENABLE ROW LEVEL SECURITY;

-- History table policies
CREATE POLICY "Users can view their own entry history" ON daily_entry_history
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert entry history" ON daily_entry_history
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- File processing log policies  
CREATE POLICY "Users can view their own file processing logs" ON analysis_file_processing_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert file processing logs" ON analysis_file_processing_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 11. Function to safely update entries with new file data
CREATE OR REPLACE FUNCTION update_analysis_with_file(
  p_analysis_id uuid,
  p_file_type text,
  p_entries jsonb,
  p_merge_strategy text DEFAULT 'smart'
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_updated_count integer := 0;
  v_created_count integer := 0;
  v_user_id uuid;
  entry jsonb;
BEGIN
  -- Get user_id from the analysis
  SELECT user_id INTO v_user_id FROM analyses WHERE id = p_analysis_id;
  
  -- Check if analysis is locked
  IF EXISTS (SELECT 1 FROM analyses WHERE id = p_analysis_id AND is_locked = true) THEN
    RAISE EXCEPTION 'Analysis is locked and cannot be updated';
  END IF;
  
  -- Process each entry
  FOR entry IN SELECT * FROM jsonb_array_elements(p_entries) LOOP
    -- Check if entry exists for this date
    IF EXISTS (
      SELECT 1 FROM daily_entries 
      WHERE analysis_id = p_analysis_id 
      AND date = (entry->>'date')::date
    ) THEN
      -- Update existing entry based on file type and merge strategy
      IF p_file_type = 'invoice' THEN
        -- Update payment amount based on merge strategy
        UPDATE daily_entries
        SET paid_amount = CASE 
              WHEN p_merge_strategy = 'replace' THEN (entry->>'paid_amount')::decimal
              WHEN p_merge_strategy = 'add' THEN paid_amount + (entry->>'paid_amount')::decimal
              WHEN p_merge_strategy = 'max' THEN GREATEST(paid_amount, (entry->>'paid_amount')::decimal)
              ELSE (entry->>'paid_amount')::decimal
            END,
            difference = expected_amount - CASE 
              WHEN p_merge_strategy = 'replace' THEN (entry->>'paid_amount')::decimal
              WHEN p_merge_strategy = 'add' THEN paid_amount + (entry->>'paid_amount')::decimal
              WHEN p_merge_strategy = 'max' THEN GREATEST(paid_amount, (entry->>'paid_amount')::decimal)
              ELSE (entry->>'paid_amount')::decimal
            END,
            payment_merge_strategy = p_merge_strategy
        WHERE analysis_id = p_analysis_id 
        AND date = (entry->>'date')::date;
        
        v_updated_count := v_updated_count + 1;
        
      ELSIF p_file_type = 'runsheet' THEN
        -- Update consignment data
        UPDATE daily_entries
        SET consignments = (entry->>'consignments')::integer,
            expected_amount = (entry->>'expected_amount')::decimal,
            unloading_bonus = (entry->>'unloading_bonus')::boolean,
            attendance_bonus = (entry->>'attendance_bonus')::boolean,
            early_bonus = (entry->>'early_bonus')::boolean,
            difference = (entry->>'expected_amount')::decimal - paid_amount
        WHERE analysis_id = p_analysis_id 
        AND date = (entry->>'date')::date;
        
        v_updated_count := v_updated_count + 1;
      END IF;
      
    ELSE
      -- Create new entry
      INSERT INTO daily_entries (
        analysis_id, user_id, date,
        consignments, expected_amount, paid_amount, difference,
        unloading_bonus, attendance_bonus, early_bonus,
        payment_merge_strategy
      ) VALUES (
        p_analysis_id, v_user_id, (entry->>'date')::date,
        COALESCE((entry->>'consignments')::integer, 0),
        COALESCE((entry->>'expected_amount')::decimal, 0),
        COALESCE((entry->>'paid_amount')::decimal, 0),
        COALESCE((entry->>'expected_amount')::decimal, 0) - COALESCE((entry->>'paid_amount')::decimal, 0),
        COALESCE((entry->>'unloading_bonus')::boolean, false),
        COALESCE((entry->>'attendance_bonus')::boolean, false),
        COALESCE((entry->>'early_bonus')::boolean, false),
        p_merge_strategy
      );
      
      v_created_count := v_created_count + 1;
    END IF;
  END LOOP;
  
  -- Return summary
  v_result := jsonb_build_object(
    'success', true,
    'updated_entries', v_updated_count,
    'created_entries', v_created_count,
    'total_processed', v_updated_count + v_created_count
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_analysis_with_file TO authenticated;