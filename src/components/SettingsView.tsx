import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Download, 
  Upload, 
  RotateCcw, 
  ShieldAlert, 
  Lock, 
  Check, 
  Database,
  History
} from 'lucide-react';
import { type AppSettings } from '../db/db';
import { settingsApi } from '../lib/api/settingsApi';
import { auditApi } from '../lib/api/auditApi';

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

  const handleExportBackup = async () => {
    // For Supabase, data is already in the cloud.
    // This exports a JSON snapshot of current app state for offline reference.
    const backupData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      appName: 'NH Traders — Supabase Cloud',
      note: 'Your data is stored securely in Supabase PostgreSQL. This is a local snapshot only.',
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `nh-traders-cloud-${dateStr}.json`;
    link.click();
    URL.revokeObjectURL(url);
    alert('Your data is saved in Supabase cloud. No local backup needed.');
  };

  const handleImportBackup = (_e: React.ChangeEvent<HTMLInputElement>) => {
    alert('Data import is managed through Supabase. Contact support for bulk data migration.');
  };

  const handleResetSampleData = async () => {
    alert('Data management is handled through Supabase PostgreSQL. Use the Supabase dashboard to manage your data.');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-4xl mx-auto text-[#1F1A16]">
      {/* 1. Header */}
      <div className="bg-white border border-[#E7E0D6] rounded-xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E7E0D6] text-[#DB9F35]">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1F1A16] uppercase tracking-wide">
              Account & Risk Configuration
            </h2>
            <p className="text-xs text-[#786F66] mt-0.5">
              Customize risk limits, base currency, kill-switch behavior, and manage local backups
            </p>
          </div>
        </div>
      </div>

      {/* 2. Trading Parameters Form */}
      <form onSubmit={handleSave} className="bg-white border border-[#E7E0D6] rounded-xl p-6 space-y-5 shadow-2xs">
        <div className="border-b border-[#E7E0D6] pb-3">
          <h3 className="text-sm font-bold text-[#1F1A16] uppercase tracking-wider">
            Trading Parameters
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-[#786F66] uppercase mb-1.5">
              Initial Capital
            </label>
            <input
              type="number"
              value={formData.initialCapital}
              onChange={(e) => setFormData({ ...formData, initialCapital: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E7E0D6] rounded-xl text-[#1F1A16] font-mono focus:border-[#DB9F35] outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#786F66] uppercase mb-1.5">
              Base Currency
            </label>
            <div className="flex gap-2">
              {['USD', 'INR'].map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setFormData({ ...formData, currency: curr as any })}
                  className={`flex-1 py-2 rounded-xl font-bold border transition-all ${
                    formData.currency === curr
                      ? 'bg-[#DB9F35] text-[#1F1A16] border-[#DB9F35]'
                      : 'bg-[#FAF7F2] text-[#786F66] border-[#E7E0D6] hover:text-[#1F1A16]'
                  }`}
                >
                  {curr === 'USD' ? '$ USD' : '₹ INR'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#786F66] uppercase mb-1.5">
              Default Trading Pair
            </label>
            <input
              type="text"
              value={formData.defaultPair}
              onChange={(e) => setFormData({ ...formData, defaultPair: e.target.value })}
              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E7E0D6] rounded-xl text-[#1F1A16] font-mono focus:border-[#DB9F35] outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#786F66] uppercase mb-1.5">
              Default Lot Size
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.defaultLot}
              onChange={(e) => setFormData({ ...formData, defaultLot: parseFloat(e.target.value) || 0.01 })}
              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E7E0D6] rounded-xl text-[#1F1A16] font-mono focus:border-[#DB9F35] outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#786F66] uppercase mb-1.5">
              Risk Per Trade (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.riskPerTradePercent}
              onChange={(e) => setFormData({ ...formData, riskPerTradePercent: parseFloat(e.target.value) || 1 })}
              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E7E0D6] rounded-xl text-[#1F1A16] font-mono focus:border-[#DB9F35] outline-none"
            />
            <span className="text-[10px] text-[#786F66] mt-1 block">Rule: 0.5% - 1.0% recommended</span>
          </div>

          <div>
            <label className="block font-semibold text-[#786F66] uppercase mb-1.5">
              Daily Loss Limit (R)
            </label>
            <input
              type="number"
              step="0.5"
              value={formData.dailyLossLimitR}
              onChange={(e) => setFormData({ ...formData, dailyLossLimitR: parseFloat(e.target.value) || 2 })}
              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E7E0D6] rounded-xl text-[#1F1A16] font-mono focus:border-[#DB9F35] outline-none"
            />
            <span className="text-[10px] text-[#786F66] mt-1 block">Hits circuit breaker at this limit</span>
          </div>
        </div>

        {/* Protection Mode */}
        <div className="pt-4 border-t border-[#E7E0D6] space-y-3">
          <span className="block text-xs font-bold text-[#1F1A16] uppercase tracking-wider">
            Daily Loss Circuit Breaker Mode
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div
              onClick={() => setFormData({ ...formData, protectionMode: 'HARD_LOCK' })}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                formData.protectionMode === 'HARD_LOCK'
                  ? 'bg-[#FEECEB] border-[#DC2626]'
                  : 'bg-[#FAF7F2] border-[#E7E0D6] hover:border-[#DB9F35]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-4 h-4 text-[#DC2626]" />
                <span className="font-bold text-[#1F1A16]">HARD LOCK (Recommended)</span>
              </div>
              <p className="text-[11px] text-[#786F66] leading-relaxed">
                When -2R is reached, new trade entry is disabled completely until tomorrow. Zero exceptions.
              </p>
            </div>

            <div
              onClick={() => setFormData({ ...formData, protectionMode: 'SOFT_WARNING' })}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                formData.protectionMode === 'SOFT_WARNING'
                  ? 'bg-[#FFFBEB] border-[#DB9F35]'
                  : 'bg-[#FAF7F2] border-[#E7E0D6] hover:border-[#DB9F35]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className="w-4 h-4 text-[#DB9F35]" />
                <span className="font-bold text-[#1F1A16]">SOFT WARNING (Audit Reason)</span>
              </div>
              <p className="text-[11px] text-[#786F66] leading-relaxed">
                Displays a warning banner. Overriding requires entering a reason logged in the audit trail.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 flex items-center justify-between">
          {saveSuccess ? (
            <span className="text-xs text-[#16A34A] flex items-center gap-1.5 font-bold animate-pulse">
              <Check className="w-4 h-4" /> Settings updated successfully!
            </span>
          ) : <span />}

          <button
            type="submit"
            className="px-6 py-2 rounded-xl bg-[#DB9F35] hover:bg-[#CCA030] text-[#1F1A16] text-xs font-extrabold transition-all shadow-sm"
          >
            Save Settings
          </button>
        </div>
      </form>

      {/* 3. Data Safety & Backup / Restore */}
      <div className="bg-white border border-[#E7E0D6] rounded-xl p-6 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2 border-b border-[#E7E0D6] pb-3">
          <Database className="w-5 h-5 text-[#DB9F35]" />
          <h3 className="text-sm font-bold text-[#1F1A16] uppercase tracking-wider">
            Data Safety & Local Storage (IndexedDB)
          </h3>
        </div>
        <p className="text-xs text-[#786F66] leading-relaxed">
          NH Traders runs 100% locally on your computer. Trades and full-resolution chart screenshots are safely persisted in your browser's IndexedDB database. You can export or restore a backup anytime.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleExportBackup}
            className="px-4 py-2 rounded-xl bg-[#E8F8EE] hover:bg-[#D8F3E2] border border-[#B7ECC8] text-[#15803D] text-xs font-bold flex items-center gap-2 transition-all shadow-2xs"
          >
            <Download className="w-4 h-4" />
            Export Complete Backup (.json)
          </button>

          <label className="px-4 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#F3EDE2] border border-[#E7E0D6] text-[#1F1A16] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer">
            <Upload className="w-4 h-4 text-[#DB9F35]" />
            Import Backup (.json)
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>

          <button
            onClick={handleResetSampleData}
            className="px-4 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#F3EDE2] border border-[#E7E0D6] text-[#786F66] hover:text-[#DC2626] text-xs font-semibold flex items-center gap-2 transition-all ml-auto"
          >
            <RotateCcw className="w-4 h-4" />
            Restore Notion Sample Trades
          </button>
        </div>
      </div>

      {/* 4. Discipline Audit Trail Log */}
      <div className="bg-white border border-[#E7E0D6] rounded-xl p-6 space-y-3 shadow-2xs">
        <div className="flex items-center gap-2 border-b border-[#E7E0D6] pb-3">
          <History className="w-5 h-5 text-[#DB9F35]" />
          <h3 className="text-sm font-bold text-[#1F1A16] uppercase tracking-wider">
            Discipline Audit Trail
          </h3>
        </div>
        <p className="text-xs text-[#786F66]">
          Logs every trade creation, modification, lock override, and daily close for accountability.
        </p>

        <div className="bg-[#FAF7F2] rounded-xl border border-[#E7E0D6] divide-y divide-[#E7E0D6] max-h-48 overflow-y-auto font-mono text-xs">
          {auditLogs.length === 0 ? (
            <div className="p-4 text-center text-[#9E958C]">No audit logs recorded yet.</div>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="p-3 flex items-start justify-between gap-3">
                <div>
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] mr-2 ${
                    log.action === 'OVERRIDE_LOCK' ? 'bg-[#FEECEB] text-[#DC2626]' : 'bg-[#E8F8EE] text-[#15803D]'
                  }`}>
                    {log.action}
                  </span>
                  <span className="text-[#1F1A16]">{log.details}</span>
                </div>
                <span className="text-[10px] text-[#786F66] whitespace-nowrap">
                  {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
