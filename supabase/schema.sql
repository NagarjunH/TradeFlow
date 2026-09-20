-- ============================================================
-- NH TRADERS — Supabase SQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 0. Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES TABLE
-- Auto-created when a user signs up
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL DEFAULT 'NH Trader',
  base_currency  TEXT NOT NULL DEFAULT 'USD' CHECK (base_currency IN ('USD', 'INR')),
  initial_capital NUMERIC(12,2) NOT NULL DEFAULT 1000.00,
  current_balance NUMERIC(12,2) NOT NULL DEFAULT 1000.00,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"    ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- 2. USER_SETTINGS TABLE
-- One row per user, like AppSettings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id              UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  risk_per_trade       NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  daily_loss_limit_r   NUMERIC(5,2) NOT NULL DEFAULT 2.0,
  max_open_trades      INTEGER NOT NULL DEFAULT 1,
  protection_mode      TEXT NOT NULL DEFAULT 'HARD_LOCK' CHECK (protection_mode IN ('HARD_LOCK', 'SOFT_WARNING')),
  default_pair         TEXT NOT NULL DEFAULT 'XAUUSD',
  default_lot          NUMERIC(8,3) NOT NULL DEFAULT 0.01,
  default_session      TEXT NOT NULL DEFAULT 'London/NY Overlap',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 3. TRADES TABLE
-- Core trade journal — every trade logged here
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trades (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trade_number     INTEGER NOT NULL,
  trade_date       DATE NOT NULL,
  trade_time       TEXT NOT NULL DEFAULT '00:00',
  pair             TEXT NOT NULL DEFAULT 'XAUUSD',
  direction        TEXT NOT NULL CHECK (direction IN ('BUY', 'SELL')),
  lot_size         NUMERIC(8,3) NOT NULL DEFAULT 0.01,
  entry_price      NUMERIC(10,5),
  sl_price         NUMERIC(10,5),
  tp_price         NUMERIC(10,5),
  pnl              NUMERIC(12,2) NOT NULL DEFAULT 0,
  r_multiple       NUMERIC(6,2) NOT NULL DEFAULT 0,
  pips             NUMERIC(8,1),
  exit_type        TEXT NOT NULL DEFAULT 'MANUAL_EXIT'
                     CHECK (exit_type IN ('TARGET', 'STOP_LOSS', 'MANUAL_EXIT', 'BREAKEVEN')),
  trade_quality    TEXT NOT NULL DEFAULT 'CLEAN'
                     CHECK (trade_quality IN ('CLEAN', 'MANAGEABLE_MISTAKE', 'VIOLATION')),
  emotion          TEXT NOT NULL DEFAULT 'CALM'
                     CHECK (emotion IN ('CALM', 'FOCUSED', 'FOMO', 'REVENGE', 'GREED', 'HESITANT', 'BOREDOM')),
  execution        TEXT NOT NULL DEFAULT 'CLEAN' CHECK (execution IN ('CLEAN', 'VIOLATION')),
  violation_reason TEXT,
  setup_type       TEXT,
  htf_context      TEXT CHECK (htf_context IN ('Bullish', 'Bearish', 'Neutral')),
  entry_reason     TEXT,
  session          TEXT CHECK (session IN ('London', 'New York', 'Asian', 'London/NY Overlap')),
  notes            TEXT,
  chart_url        TEXT,  -- Supabase Storage URL (no base64!)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trades_user_date ON public.trades(user_id, trade_date DESC);
CREATE INDEX idx_trades_user_pair  ON public.trades(user_id, pair);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their trades" ON public.trades FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 4. DAILY_RECORDS TABLE
-- One row per trading day per user
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  record_date     DATE NOT NULL,
  cycle_day       INTEGER,
  is_no_trade_day BOOLEAN NOT NULL DEFAULT FALSE,
  no_trade_reason TEXT CHECK (no_trade_reason IN ('No Setup', 'Daily Limit Hit', 'Market Conditions', 'Personal', 'Planned Rest')),
  rules_json      JSONB NOT NULL DEFAULT '{
    "riskManagement": false,
    "dailyLossLimit": false,
    "slPredefined": false,
    "noAveragingDown": false,
    "htfContextClear": false,
    "smcSequenceFollowed": false,
    "noEmotionalTrade": false,
    "newsChecked": false
  }'::jsonb,
  is_day_closed   BOOLEAN NOT NULL DEFAULT FALSE,
  closing_notes   TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, record_date)
);

CREATE INDEX idx_daily_records_user_date ON public.daily_records(user_id, record_date DESC);

ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their daily records" ON public.daily_records FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 5. RULE_VIOLATIONS TABLE
-- Logs each rule breach event
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rule_violations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trade_id        UUID REFERENCES public.trades(id) ON DELETE SET NULL,
  violation_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  violation_type  TEXT NOT NULL,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_violations_user ON public.rule_violations(user_id, violation_date DESC);

ALTER TABLE public.rule_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their violations" ON public.rule_violations FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 6. AUDIT_LOGS TABLE
-- Immutable action trail
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trade_id    UUID REFERENCES public.trades(id) ON DELETE SET NULL,
  action      TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'OVERRIDE_LOCK', 'DAY_CLOSE', 'RESET')),
  details     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON public.audit_logs(user_id, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own audit logs"   ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own audit logs" ON public.audit_logs FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 7. AUTO-CREATE PROFILE ON SIGNUP
-- Trigger: When auth.users row is created → auto-create profile + settings
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, name, base_currency, initial_capital, current_balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'NH Trader'),
    'USD',
    1000.00,
    1000.00
  );

  -- Create default settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 8. STORAGE BUCKET for Chart Screenshots
-- Run this after creating the bucket in Storage UI, OR via this SQL
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chart-screenshots',
  'chart-screenshots',
  FALSE,
  5242880,  -- 5 MB per file
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload own screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chart-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own screenshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chart-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own screenshots"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chart-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
