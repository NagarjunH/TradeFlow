-- ============================================================
-- TradeFlow — Relax Check Constraints on trades table
-- Run this in Supabase Dashboard -> SQL Editor if desired
-- ============================================================

ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_htf_context_check;
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_session_check;
