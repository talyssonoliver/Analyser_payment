/**
 * Supabase Database Types
 * Generated from the database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          email: string
          display_name: string | null
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          display_name?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          display_name?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
      payment_rules: {
        Row: {
          id: string
          user_id: string
          version: number
          weekday_rate: number
          saturday_rate: number
          unloading_bonus: number
          attendance_bonus: number
          early_bonus: number
          is_active: boolean
          valid_from: string
          valid_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          version?: number
          weekday_rate: number
          saturday_rate: number
          unloading_bonus: number
          attendance_bonus: number
          early_bonus: number
          is_active?: boolean
          valid_from?: string
          valid_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          version?: number
          weekday_rate?: number
          saturday_rate?: number
          unloading_bonus?: number
          attendance_bonus?: number
          early_bonus?: number
          is_active?: boolean
          valid_from?: string
          valid_until?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      analyses: {
        Row: {
          id: string
          user_id: string
          fingerprint: string | null
          source: 'upload' | 'manual' | 'import'
          status: 'pending' | 'processing' | 'completed' | 'error'
          period_start: string
          period_end: string
          rules_version: number
          working_days: number
          total_consignments: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          fingerprint?: string | null
          source: 'upload' | 'manual' | 'import'
          status?: 'pending' | 'processing' | 'completed' | 'error'
          period_start: string
          period_end: string
          rules_version: number
          working_days?: number
          total_consignments?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          fingerprint?: string | null
          source?: 'upload' | 'manual' | 'import'
          status?: 'pending' | 'processing' | 'completed' | 'error'
          period_start?: string
          period_end?: string
          rules_version?: number
          working_days?: number
          total_consignments?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      daily_entries: {
        Row: {
          id: string
          analysis_id: string
          date: string
          day_of_week: number
          consignments: number
          rate: number
          base_payment: number
          pickups: number
          pickup_total: number
          unloading_bonus: number
          attendance_bonus: number
          early_bonus: number
          expected_total: number
          paid_amount: number
          difference: number
          status: 'balanced' | 'overpaid' | 'underpaid'
          created_at: string
        }
        Insert: {
          id?: string
          analysis_id: string
          date: string
          day_of_week: number
          consignments?: number
          rate: number
          base_payment?: number
          pickups?: number
          pickup_total?: number
          unloading_bonus?: number
          attendance_bonus?: number
          early_bonus?: number
          expected_total: number
          paid_amount: number
          difference: number
          status: 'balanced' | 'overpaid' | 'underpaid'
          created_at?: string
        }
        Update: {
          id?: string
          analysis_id?: string
          date?: string
          day_of_week?: number
          consignments?: number
          rate?: number
          base_payment?: number
          pickups?: number
          pickup_total?: number
          unloading_bonus?: number
          attendance_bonus?: number
          early_bonus?: number
          expected_total?: number
          paid_amount?: number
          difference?: number
          status?: 'balanced' | 'overpaid' | 'underpaid'
          created_at?: string
        }
      }
      analysis_totals: {
        Row: {
          id: string
          analysis_id: string
          base_total: number
          pickup_total: number
          bonus_total: number
          expected_total: number
          paid_total: number
          difference_total: number
          created_at: string
        }
        Insert: {
          id?: string
          analysis_id: string
          base_total?: number
          pickup_total?: number
          bonus_total?: number
          expected_total?: number
          paid_total?: number
          difference_total?: number
          created_at?: string
        }
        Update: {
          id?: string
          analysis_id?: string
          base_total?: number
          pickup_total?: number
          bonus_total?: number
          expected_total?: number
          paid_total?: number
          difference_total?: number
          created_at?: string
        }
      }
      analysis_files: {
        Row: {
          id: string
          analysis_id: string
          storage_path: string
          original_name: string
          file_size: number
          file_hash: string
          mime_type: string
          file_type: 'runsheet' | 'invoice' | 'other'
          parsed_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          analysis_id: string
          storage_path: string
          original_name: string
          file_size: number
          file_hash: string
          mime_type: string
          file_type: 'runsheet' | 'invoice' | 'other'
          parsed_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          analysis_id?: string
          storage_path?: string
          original_name?: string
          file_size?: number
          file_hash?: string
          mime_type?: string
          file_type?: 'runsheet' | 'invoice' | 'other'
          parsed_data?: Json | null
          created_at?: string
        }
      }
      user_sessions: {
        Row: {
          id: string
          user_id: string
          recovery_data: Json | null
          last_activity: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          recovery_data?: Json | null
          last_activity?: string
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          recovery_data?: Json | null
          last_activity?: string
          expires_at?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      analysis_status: 'pending' | 'processing' | 'completed' | 'error'
      analysis_source: 'upload' | 'manual' | 'import'
      payment_status: 'balanced' | 'overpaid' | 'underpaid'
      file_type: 'runsheet' | 'invoice' | 'other'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}