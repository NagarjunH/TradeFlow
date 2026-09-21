// ============================================================
// TradeFlow — Supabase Audit Logs API
// ============================================================
import { supabase } from '../supabase';

export const auditApi = {
  async add(userId: string, action: string, details: string, tradeId?: string): Promise<void> {
    const { error } = await supabase.from('audit_logs').insert({
      user_id: userId,
      trade_id: tradeId ?? null,
      action,
      details,
    } as never);
    if (error) console.error('[AuditLog] Failed to write:', error.message);
    // Non-blocking: audit failures should not crash the app
  },

  async getRecent(userId: string, limit = 15) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  },
};
