import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[NH Traders] Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://stmmeddkycvhelvxgone.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0bW1lZGRreWN2aGVsdnhnb25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MTkyMTIsImV4cCI6MjEwNTQ5NTIxMn0.E0A6jzjg-HXyY-tRw1zKvaVsuNR3JfAHIaSZY2D6tf8',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
