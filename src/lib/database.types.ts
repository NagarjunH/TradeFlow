// Auto-generated TypeScript types for Supabase PostgreSQL schema
// Update these after running "supabase gen types typescript" or manually syncing

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          base_currency: string;
          initial_capital: number;
          current_balance: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name?: string;
          base_currency?: string;
          initial_capital?: number;
          current_balance?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          base_currency?: string;
          initial_capital?: number;
          current_balance?: number;
        };
      };
      user_settings: {
        Row: {
          user_id: string;
          risk_per_trade: number;
          daily_loss_limit_r: number;
          max_open_trades: number;
          protection_mode: string;
          default_pair: string;
          default_lot: number;
          default_session: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          risk_per_trade?: number;
          daily_loss_limit_r?: number;
          max_open_trades?: number;
          protection_mode?: string;
          default_pair?: string;
          default_lot?: number;
          default_session?: string;
          updated_at?: string;
        };
        Update: {
          risk_per_trade?: number;
          daily_loss_limit_r?: number;
          max_open_trades?: number;
          protection_mode?: string;
          default_pair?: string;
          default_lot?: number;
          default_session?: string;
          updated_at?: string;
        };
      };
      trades: {
        Row: {
          id: string;
          user_id: string;
          trade_number: number;
          trade_date: string;
          trade_time: string;
          pair: string;
          direction: string;
          lot_size: number;
          entry_price: number | null;
          sl_price: number | null;
          tp_price: number | null;
          pnl: number;
          r_multiple: number;
          pips: number | null;
          exit_type: string;
          trade_quality: string;
          emotion: string;
          execution: string;
          violation_reason: string | null;
          setup_type: string | null;
          htf_context: string | null;
          entry_reason: string | null;
          session: string | null;
          notes: string | null;
          chart_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['trades']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Database['public']['Tables']['trades']['Row'], 'id' | 'user_id' | 'created_at'>>;
      };
      daily_records: {
        Row: {
          id: string;
          user_id: string;
          record_date: string;
          cycle_day: number | null;
          is_no_trade_day: boolean;
          no_trade_reason: string | null;
          rules_json: Json;
          is_day_closed: boolean;
          closing_notes: string | null;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['daily_records']['Row'], 'id'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['daily_records']['Row'], 'id' | 'user_id'>>;
      };
      rule_violations: {
        Row: {
          id: string;
          user_id: string;
          trade_id: string | null;
          violation_date: string;
          violation_type: string;
          description: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['rule_violations']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: never;
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string;
          trade_id: string | null;
          action: string;
          details: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: never;
      };
    };
  };
}
