-- Fix the entry history trigger to handle missing user_id

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS daily_entry_history_trigger ON daily_entries;

-- Create improved function to log entry changes
CREATE OR REPLACE FUNCTION log_daily_entry_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user_id from the analysis
  SELECT user_id INTO v_user_id FROM analyses WHERE id = NEW.analysis_id;
  
  -- Only proceed if we have a user_id
  IF v_user_id IS NOT NULL THEN
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
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Error in log_daily_entry_change: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER daily_entry_history_trigger
AFTER INSERT OR UPDATE ON daily_entries
FOR EACH ROW EXECUTE FUNCTION log_daily_entry_change();

-- Also make the update_analysis_timestamp function more robust
CREATE OR REPLACE FUNCTION update_analysis_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE analyses 
  SET last_updated_at = now(),
      update_count = COALESCE(update_count, 0) + 1
  WHERE id = NEW.analysis_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Error in update_analysis_timestamp: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;