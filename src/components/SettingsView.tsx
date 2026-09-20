import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Download, 
  ShieldAlert, 
  Lock, 
  Check, 
  Database,
  History,
  Trash2,
  AlertTriangle,
  X
} from 'lucide-react';
import { type AppSettings } from '../db/db';
import { settingsApi } from '../lib/api/settingsApi';
import { auditApi } from '../lib/api/auditApi';
import { supabase } from '../lib/supabase';

interface SettingsViewProps {
  settings: AppSettings;
  onSettingsUpdated: () => void;
  userId?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSettingsUpdated,
  userId,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [auditLogs, setAuditLogs] = useState<{ id: string; action: string; details: string; created_at: string }[]>([]);

  // Reset Modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    setFormData(settings);
    if (userId) loadAuditLogs();
  }, [settings, userId]);

  const loadAuditLogs = async () => {
    if (!userId) return;
    try {
      const logs = await auditApi.getRecent(userId, 15);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    await settingsApi.save(userId, formData);
    await auditApi.add(
      userId,
      'UPDATE',
      `Updated settings (Currency: ${formData.currency}, Risk: ${formData.riskPerTradePercent}%, Limit: ${formData.dailyLossLimitR}R, Mode: ${formData.protectionMode})`
    );
    setSaveSuccess(true);
    onSettingsUpdated();
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleExportBackup = () => {
    const backupData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      appName: 'TradeFlow Cloud Database',
      settings: formData,
      note: 'Your data is securely stored in Supabase cloud PostgreSQL.',
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `tradeflow-backup-${dateStr}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setResetError(null);
    setIsResetting(true);

    try {
      // 1. Re-authenticate user with entered Email and Password
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: confirmEmail.trim(),
        password: confirmPassword,
      });

      if (authErr || !authData.user) {
        throw new Error('Invalid email or password. Authentication failed.');
      }

      if (authData.user.id !== userId) {
        throw new Error('Email does not match current logged-in account.');
      }

      // 2. Wipe all user data from Supabase (trades, daily checklist records, violations, audit logs)
      await Promise.allSettled([
        supabase.from('trades').delete().eq('user_id', userId),
        supabase.from('daily_records').delete().eq('user_id', userId),
        supabase.from('rule_violations').delete().eq('user_id', userId),
        supabase.from('audit_logs').delete().eq('user_id', userId),
      ]);

      // 3. Reset profile balance to initial capital
      await supabase
        .from('profiles')
        .update({ current_balance: formData.initialCapital } as never)
        .eq('id', userId);

      // 4. Log the reset event
      try {
        await auditApi.add(userId, 'RESET', 'User wiped all trading journal records and reset balance.');
      } catch (logErr) {
        console.warn('Could not write reset audit log:', logErr);
      }

      setResetSuccess(true);
      setTimeout(() => {
        setIsResetModalOpen(false);
        setConfirmEmail('');
        setConfirmPassword('');
        setResetSuccess(false);
        onSettingsUpdated();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset data.';
      setResetError(msg);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-4xl mx-auto text-[#1F1A16] dark:text-[#F0F4F8]">
      {/* 1. Header */}
      <div className="bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl p-5 sm:p-6 shadow-2xs transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#FAF7F2] dark:bg-[#1C2331] border border-[#E7E0D6] dark:border-[#283244] text-[#10B981]">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold uppercase tracking-wide">
              Account & Risk Configuration
            </h2>
            <p className="text-xs text-[#786F66] dark:text-[#94A3B8] mt-0.5">
              Customize risk parameters, base currency, loss limits, and cloud data controls
            </p>
          </div>
        </div>
      </div>

      {/* 2. Trading Parameters Form */}
      <form onSubmit={handleSave} className="bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl p-6 space-y-5 shadow-2xs transition-colors">
        <div className="border-b border-[#E7E0D6] dark:border-[#242D3D] pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#10B981]">
            Trading Parameters
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-[#786F66] dark:text-[#94A3B8] uppercase mb-1.5">
              Initial Capital
            </label>
            <input
              type="number"
              value={formData.initialCapital}
              onChange={(e) => setFormData({ ...formData, initialCapital: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#0E121B] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl text-[#1F1A16] dark:text-[#F0F4F8] font-mono focus:border-[#10B981] outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#786F66] dark:text-[#94A3B8] uppercase mb-1.5">
              Base Currency
            </label>
            <div className="flex gap-2">
              {(['USD', 'INR'] as const).map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setFormData({ ...formData, currency: curr })}
                  className={`flex-1 py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                    formData.currency === curr
                      ? 'bg-[#10B981]/15 text-[#059669] dark:text-[#34D399] border-[#10B981]'
                      : 'bg-[#FAF7F2] dark:bg-[#0E121B] border-[#E7E0D6] dark:border-[#242D3D] text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8]'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#786F66] dark:text-[#94A3B8] uppercase mb-1.5">
              Risk Per Trade (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.riskPerTradePercent}
              onChange={(e) => setFormData({ ...formData, riskPerTradePercent: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#0E121B] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl text-[#1F1A16] dark:text-[#F0F4F8] font-mono focus:border-[#10B981] outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#786F66] dark:text-[#94A3B8] uppercase mb-1.5">
              Daily Loss Limit (R)
            </label>
            <input
              type="number"
              step="0.5"
              value={formData.dailyLossLimitR}
              onChange={(e) => setFormData({ ...formData, dailyLossLimitR: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#0E121B] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl text-[#1F1A16] dark:text-[#F0F4F8] font-mono focus:border-[#10B981] outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#786F66] dark:text-[#94A3B8] uppercase mb-1.5">
              Default Instrument
            </label>
            <input
              type="text"
              value={formData.defaultPair}
              onChange={(e) => setFormData({ ...formData, defaultPair: e.target.value })}
              className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#0E121B] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#10B981] outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#786F66] dark:text-[#94A3B8] uppercase mb-1.5">
              Circuit Breaker Protection Mode
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, protectionMode: 'HARD_LOCK' })}
                className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  formData.protectionMode === 'HARD_LOCK'
                    ? 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]'
                    : 'bg-[#FAF7F2] dark:bg-[#0E121B] border-[#E7E0D6] dark:border-[#242D3D] text-[#786F66] dark:text-[#94A3B8]'
                }`}
              >
                <Lock className="w-3 h-3" /> Hard Lock
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, protectionMode: 'SOFT_WARNING' })}
                className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  formData.protectionMode === 'SOFT_WARNING'
                    ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]'
                    : 'bg-[#FAF7F2] dark:bg-[#0E121B] border-[#E7E0D6] dark:border-[#242D3D] text-[#786F66] dark:text-[#94A3B8]'
                }`}
              >
                <ShieldAlert className="w-3 h-3" /> Soft Warning
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E7E0D6] dark:border-[#242D3D] flex items-center justify-between">
          {saveSuccess ? (
            <span className="text-xs font-semibold text-[#10B981] flex items-center gap-1.5 animate-fade-in">
              <Check className="w-4 h-4" /> Settings updated successfully!
            </span>
          ) : <span />}

          <button
            type="submit"
            className="px-6 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Save Settings
          </button>
        </div>
      </form>

      {/* 3. Cloud Data Backup & Danger Zone */}
      <div className="bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl p-6 space-y-4 shadow-2xs transition-colors">
        <div className="flex items-center gap-2 border-b border-[#E7E0D6] dark:border-[#242D3D] pb-3">
          <Database className="w-5 h-5 text-[#10B981]" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Cloud Data Controls
          </h3>
        </div>
        <p className="text-xs text-[#786F66] dark:text-[#94A3B8] leading-relaxed">
          TradeFlow synchronizes your trading records directly with Supabase PostgreSQL cloud database. You can export a snapshot backup anytime or reset all account data with password verification.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={handleExportBackup}
            className="px-4 py-2 rounded-xl bg-[#FAF7F2] dark:bg-[#1C2331] hover:bg-[#F3EDE2] dark:hover:bg-[#222C3E] border border-[#E7E0D6] dark:border-[#283244] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#10B981]" />
            Export Data Snapshot (.json)
          </button>

          {/* Reset All Data Button (Requirement 3) */}
          <button
            onClick={() => {
              setConfirmEmail('');
              setConfirmPassword('');
              setResetError(null);
              setIsResetModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#FEECEB] dark:bg-[#321B1B] hover:bg-[#FCD8D6] dark:hover:bg-[#422020] border border-[#FCA5A5] dark:border-[#7F1D1D] text-[#DC2626] dark:text-[#F87171] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Reset All Account Data
          </button>
        </div>
      </div>

      {/* 4. Discipline Audit Trail Log */}
      <div className="bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl p-6 space-y-3 shadow-2xs transition-colors">
        <div className="flex items-center gap-2 border-b border-[#E7E0D6] dark:border-[#242D3D] pb-3">
          <History className="w-5 h-5 text-[#10B981]" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Discipline Audit Trail
          </h3>
        </div>
        <p className="text-xs text-[#786F66] dark:text-[#94A3B8]">
          Logs every trade creation, modification, lock override, and daily close for accountability.
        </p>

        <div className="bg-[#FAF7F2] dark:bg-[#0E121B] rounded-xl border border-[#E7E0D6] dark:border-[#242D3D] divide-y divide-[#E7E0D6] dark:divide-[#242D3D] max-h-48 overflow-y-auto font-mono text-xs">
          {auditLogs.length === 0 ? (
            <div className="p-4 text-center text-[#9E958C] dark:text-[#64748B]">No audit logs recorded yet.</div>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="p-3 flex items-start justify-between gap-3">
                <div>
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] mr-2 ${
                    log.action === 'OVERRIDE_LOCK' || log.action === 'RESET'
                      ? 'bg-[#FEECEB] dark:bg-[#321B1B] text-[#DC2626] dark:text-[#F87171]' 
                      : 'bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399]'
                  }`}>
                    {log.action}
                  </span>
                  <span className="text-[#1F1A16] dark:text-[#F0F4F8]">{log.details}</span>
                </div>
                <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8] whitespace-nowrap">
                  {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 5. Secure Reset Confirmation Modal (Requirement 3) */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div 
            className="max-w-md w-full bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E0D6] dark:border-[#242D3D] bg-[#FEECEB]/60 dark:bg-[#2B1414]">
              <div className="flex items-center gap-2.5 text-[#DC2626] dark:text-[#F87171]">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Reset All Account Data</h3>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="p-1 rounded-lg text-[#786F66] hover:text-[#1F1A16] dark:text-[#94A3B8] dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleExecuteReset} className="p-6 space-y-4">
              <div className="p-3 bg-[#FEECEB] dark:bg-[#321B1B] border border-[#FCA5A5] dark:border-[#7F1D1D] rounded-xl text-xs text-[#B91C1C] dark:text-[#FCA5A5] space-y-1">
                <p className="font-bold">⚠️ Irreversible Warning:</p>
                <p>
                  This action will permanently delete all trades, daily closing checklists, rule violations, and audit history. Your balance will be reset to initial capital.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">Confirm Account Email</label>
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F2] dark:bg-[#0E121B] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl text-xs focus:border-[#DC2626] outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">Confirm Account Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F2] dark:bg-[#0E121B] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl text-xs focus:border-[#DC2626] outline-none transition-colors"
                />
              </div>

              {resetError && (
                <div className="p-3 bg-[#FEECEB] dark:bg-[#321B1B] border border-[#FCA5A5] dark:border-[#7F1D1D] rounded-xl text-xs text-[#DC2626] dark:text-[#F87171]">
                  {resetError}
                </div>
              )}

              {resetSuccess && (
                <div className="p-3 bg-[#E8F8EE] dark:bg-[#132A1C] border border-[#B7ECC8] dark:border-[#1E4D30] rounded-xl text-xs text-[#15803D] dark:text-[#34D399] flex items-center gap-2">
                  <Check className="w-4 h-4" /> All data successfully wiped and reset!
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#E7E0D6] dark:border-[#242D3D] text-xs font-semibold hover:bg-[#FAF7F2] dark:hover:bg-[#1A2230] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting || resetSuccess}
                  className="flex-1 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-50 text-white text-xs font-black shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isResetting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" /> Confirm & Wipe Data
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
