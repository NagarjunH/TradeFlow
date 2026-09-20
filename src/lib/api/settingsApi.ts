// ============================================================
// NH Traders — Supabase Settings API
// ============================================================
import { supabase } from '../supabase';
import type { AppSettings } from '../../db/db';

export const settingsApi = {
  async get(userId: string): Promise<AppSettings | null> {
    const [profileRes, settingsRes] = (await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_settings').select('*').eq('user_id', userId).single(),
    ])) as [any, any]; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (settingsRes.error || !settingsRes.data) return null;
    if (profileRes.error || !profileRes.data) return null;

    const s = settingsRes.data;
    const p = profileRes.data;

    return {
      id: 'settings',
      initialCapital: Number(p.initial_capital),
      currentBalance: Number(p.current_balance),
      currency: p.base_currency as 'USD' | 'INR',
      defaultPair: s.default_pair,
      defaultLot: Number(s.default_lot),
      riskPerTradePercent: Number(s.risk_per_trade),
      dailyLossLimitR: Number(s.daily_loss_limit_r),
      protectionMode: s.protection_mode as AppSettings['protectionMode'],
      defaultSession: s.default_session as AppSettings['defaultSession'],
      theme: 'Dark',
    };
  },

  async save(userId: string, settings: AppSettings): Promise<void> {
    const [profileErr, settingsErr] = await Promise.all([
      supabase
        .from('profiles')
        .update({
          base_currency: settings.currency,
          initial_capital: settings.initialCapital,
          current_balance: settings.currentBalance,
        } as never)
        .eq('id', userId)
        .then(({ error }) => error),
      supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          risk_per_trade: settings.riskPerTradePercent,
          daily_loss_limit_r: settings.dailyLossLimitR,
          max_open_trades: 1,
          protection_mode: settings.protectionMode,
          default_pair: settings.defaultPair,
          default_lot: settings.defaultLot,
          default_session: settings.defaultSession,
          updated_at: new Date().toISOString(),
        } as never, { onConflict: 'user_id' })
        .then(({ error }) => error),
    ]);

    if (profileErr) throw profileErr;
    if (settingsErr) throw settingsErr;
  },
};
