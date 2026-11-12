import React, { useState, useMemo } from 'react';
import {
  X,
  Zap,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  ClipboardPaste,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import type { Trade, AppSettings } from '../db/db';
import { tradesApi } from '../lib/api/tradesApi';
import { parseVantageHistoryText, toTradeFlowPayload } from '../utils/vantageParser';

interface VantageSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  userId: string;
  settings: AppSettings;
  onSyncComplete: () => void;
}

export const VantageSyncModal: React.FC<VantageSyncModalProps> = ({
  isOpen,
  onClose,
  trades,
  userId,
  settings,
  onSyncComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'extension' | 'paste'>('paste');
  const [rawText, setRawText] = useState<string>('');
  const [convertUtcToLocal, setConvertUtcToLocal] = useState<boolean>(true);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const currSymbol = settings?.currency === 'USD' ? '$' : '₹';

  const existingTickets = useMemo(() => {
    return new Set(trades.map((t) => t.brokerTicketId).filter(Boolean) as string[]);
  }, [trades]);

  const existingSignatures = useMemo(() => {
    return new Set(
      trades.map(
        (t) =>
          `${t.date}_${t.time}_${(t.pair || '').replace('/', '').toUpperCase()}_${t.order}_${Number(t.lotSize).toFixed(2)}_${Number(t.pnl).toFixed(2)}`
      )
    );
  }, [trades]);

  const parsedPreview = useMemo(() => {
    const items = parseVantageHistoryText(rawText, convertUtcToLocal);
    return items.map((item) => {
      const sig = `${item.date}_${item.time}_${item.pair.replace('/', '').toUpperCase()}_${item.order}_${item.lotSize.toFixed(2)}_${item.netPnl.toFixed(2)}`;
      const isDuplicate =
        existingTickets.has(item.brokerTicketId) || existingSignatures.has(sig);
      return { ...item, isDuplicate };
    });
  }, [rawText, convertUtcToLocal, existingTickets, existingSignatures]);

  const newTradesCount = parsedPreview.filter((p) => !p.isDuplicate).length;
  const vantageSyncedCount = useMemo(
    () =>
      trades.filter(
        (t) =>
          t.brokerSource === 'Vantage Web-Trade' ||
          t.setupType === 'Vantage Web-Trade' ||
          Boolean(t.brokerTicketId?.startsWith('vnt_'))
      ).length,
    [trades]
  );

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRawText(reader.result);
        setImportResult(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedPreview.length === 0) return;
    setIsImporting(true);
    setImportResult(null);

    try {
      const payloads = parsedPreview.map(toTradeFlowPayload);
      const res = await tradesApi.importBrokerTrades(payloads, userId);
      setImportResult({
        type: 'success',
        message: `Successfully imported ${res.inserted.length} new trade(s)!${
          res.skipped > 0 ? ` (${res.skipped} duplicate(s) safely skipped)` : ''
        }`,
      });
      if (res.inserted.length > 0) {
        onSyncComplete();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to import Vantage trades.';
      setImportResult({ type: 'error', message: msg });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full bg-white dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl overflow-hidden shadow-2xl my-auto text-[#1F1A16] dark:text-[#F0F4F8] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E7E0D6] dark:border-[#242D3D] flex items-center justify-between bg-[#FAF6EE] dark:bg-[#0F141D]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E8F8EE] dark:bg-[#132A1C] text-[#10B981] flex items-center justify-center border border-[#10B981]/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                  Vantage Web-Trade Sync
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399] border border-[#10B981]/30">
                  {vantageSyncedCount} Synced
                </span>
              </div>
              <p className="text-xs text-[#786F66] dark:text-[#94A3B8]">
                Auto-sync orders from <code className="font-mono text-[11px]">secure.vantagemarkets.com/web-trade</code>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#786F66] hover:text-[#1F1A16] dark:text-[#94A3B8] dark:hover:text-white hover:bg-[#EFE8DB] dark:hover:bg-[#1C2331] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-5 pt-3 border-b border-[#E7E0D6] dark:border-[#242D3D] flex gap-2 bg-[#FAF7F2] dark:bg-[#121722]">
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'paste'
                ? 'border-[#10B981] text-[#10B981]'
                : 'border-transparent text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8]'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            Quick Paste / CSV Import
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('extension')}
            className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'extension'
                ? 'border-[#10B981] text-[#10B981]'
                : 'border-transparent text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Chrome Auto-Sync Extension (100% Auto)
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
          {activeTab === 'paste' ? (
            <>
              <div className="p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#242D3D] text-xs text-[#786F66] dark:text-[#94A3B8] space-y-1">
                <div className="font-bold text-[#1F1A16] dark:text-[#F0F4F8] flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-[#10B981]" />
                  2-Second Instant Import from Vantage Position History:
                </div>
                <p>
                  Vantage Terminal ke <b>Position History</b> tab me jaake apni closed rows select karein,{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#1C2331] border border-[#E7E0D6] dark:border-[#2E384D] font-mono text-[10px]">
                    Ctrl + C
                  </kbd>{' '}
                  karein aur niche paste kar dein (ya CSV file upload karein).
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#1F1A16] dark:text-[#F0F4F8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={convertUtcToLocal}
                    onChange={(e) => setConvertUtcToLocal(e.target.checked)}
                    className="rounded accent-[#10B981]"
                  />
                  Convert Vantage Time (UTC+2) to Local Time (IST)
                </label>

                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F2ECE0] dark:bg-[#1C2331] hover:bg-[#ECE4D5] dark:hover:bg-[#252E40] text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8] border border-[#DFD5C6] dark:border-[#2E384D] cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Upload CSV / TXT</span>
                  <input
                    type="file"
                    accept=".csv,.txt,.tsv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                rows={4}
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  setImportResult(null);
                }}
                placeholder="Example: Sell XAUUSD 0.01/0.01 4,045.21 4,049.73 -4.52 -4.52 0.00/0.00 11/11/2026 05:55:07 11/11/2026 06:04:22"
                className="w-full p-3 bg-[#FAF7F2] dark:bg-[#0F141D] border border-[#E7E0D6] dark:border-[#2E384D] rounded-xl text-xs font-mono text-[#1F1A16] dark:text-[#F0F4F8] focus:border-[#10B981] outline-none placeholder:text-[#9E958C]"
              />

              {parsedPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                      Detected {parsedPreview.length} Trade(s) —{' '}
                      <span className="text-[#10B981]">{newTradesCount} New</span>
                      {parsedPreview.length - newTradesCount > 0 && (
                        <span className="text-[#786F66] dark:text-[#94A3B8]">
                          {' '}
                          • {parsedPreview.length - newTradesCount} Duplicate(s)
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#FAF6EE] dark:bg-[#161D2A] text-[#786F66] dark:text-[#94A3B8] font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-2.5">Date &amp; Time</th>
                          <th className="py-2 px-2.5">Pair</th>
                          <th className="py-2 px-2.5">Dir</th>
                          <th className="py-2 px-2.5">Lots</th>
                          <th className="py-2 px-2.5">Entry → Exit</th>
                          <th className="py-2 px-2.5 text-right">Net P&amp;L</th>
                          <th className="py-2 px-2.5 text-center">Session</th>
                          <th className="py-2 px-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E7E0D6]/60 dark:divide-[#242D3D]">
                        {parsedPreview.map((item) => (
                          <tr
                            key={item.brokerTicketId}
                            className={item.isDuplicate ? 'opacity-50' : ''}
                          >
                            <td className="py-2 px-2.5 font-mono">
                              {item.date} {item.time}
                            </td>
                            <td className="py-2 px-2.5 font-bold">{item.pair}</td>
                            <td className="py-2 px-2.5">
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                                  item.order === 'BUY'
                                    ? 'bg-[#DCFCE7] dark:bg-[#143823] text-[#15803D] dark:text-[#4ADE80]'
                                    : 'bg-[#FEE2E2] dark:bg-[#3D1D1D] text-[#B91C1C] dark:text-[#F87171]'
                                }`}
                              >
                                {item.order}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 font-mono">{item.lotSize.toFixed(2)}</td>
                            <td className="py-2 px-2.5 font-mono text-[#786F66] dark:text-[#94A3B8]">
                              {item.entryPrice} → {item.exitPrice}
                            </td>
                            <td
                              className={`py-2 px-2.5 font-mono font-bold text-right ${
                                item.netPnl >= 0 ? 'text-[#10B981]' : 'text-[#DC2626]'
                              }`}
                            >
                              {item.netPnl >= 0 ? '+' : '-'}
                              {currSymbol}
                              {Math.abs(item.netPnl).toFixed(2)}
                            </td>
                            <td className="py-2 px-2.5 text-center">{item.session}</td>
                            <td className="py-2 px-2.5 text-center">
                              {item.isDuplicate ? (
                                <span className="text-[10px] text-[#786F66] dark:text-[#94A3B8]">
                                  Already Synced
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-[#10B981]">New</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                    importResult.type === 'success'
                      ? 'bg-[#E8F8EE] dark:bg-[#132A1C] text-[#15803D] dark:text-[#34D399] border-[#10B981]/30'
                      : 'bg-[#FEECEB] dark:bg-[#3D1D1D] text-[#B91C1C] dark:text-[#F87171] border-[#EF4444]/30'
                  }`}
                >
                  {importResult.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{importResult.message}</span>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#E8F8EE]/60 dark:bg-[#132A1C]/50 border border-[#10B981]/30 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-[#15803D] dark:text-[#34D399]">
                    100% Free &amp; Automatic Browser Bridge Included!
                  </div>
                  <p className="text-[#1F1A16] dark:text-[#CBD5E1]">
                    <b>TradeFlow Vantage Bridge</b> Chrome Extension aapke repo ke{' '}
                    <code className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono">
                      extension/
                    </code>{' '}
                    folder me ready hai. Install hone ke baad Vantage terminal me trade close hote hi
                    automatically TradeFlow me aa jayegi.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#242D3D]">
                  <div className="font-bold text-[#1F1A16] dark:text-[#F0F4F8] mb-1">
                    Step 1: Chrome Extensions kholein
                  </div>
                  <p className="text-[#786F66] dark:text-[#94A3B8]">
                    Chrome address bar me{' '}
                    <code className="px-1.5 py-0.5 rounded bg-white dark:bg-[#1C2331] border border-[#E7E0D6] dark:border-[#2E384D] font-mono text-[11px]">
                      chrome://extensions
                    </code>{' '}
                    open karein aur top-right par <b>Developer mode</b> ON karein.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#242D3D]">
                  <div className="font-bold text-[#1F1A16] dark:text-[#F0F4F8] mb-1">
                    Step 2: Extension Load karein
                  </div>
                  <p className="text-[#786F66] dark:text-[#94A3B8]">
                    <b>Load unpacked</b> par click karein aur apne TradeFlow project ke andar{' '}
                    <code className="px-1.5 py-0.5 rounded bg-white dark:bg-[#1C2331] border border-[#E7E0D6] dark:border-[#2E384D] font-mono text-[11px]">
                      c:\Users\nagar\TradeFlow\extension
                    </code>{' '}
                    folder select karein.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#161D2A] border border-[#E7E0D6] dark:border-[#242D3D]">
                  <div className="font-bold text-[#1F1A16] dark:text-[#F0F4F8] mb-1">
                    Step 3: 1-Click Connect &amp; Trade!
                  </div>
                  <p className="text-[#786F66] dark:text-[#94A3B8]">
                    Extension popup kholkar <b>⚡ Auto-Connect from Open TradeFlow Tab</b> par click karein.
                    Ab jab bhi aap <b>Vantage Web-Trade</b> par Position History kholenge ya trade close
                    karenge, wo automatically TradeFlow me sync ho jayegi!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#E7E0D6] dark:border-[#242D3D] bg-[#FAF7F2] dark:bg-[#0F141D] flex items-center justify-between">
          <span className="text-[11px] text-[#786F66] dark:text-[#94A3B8]">
            Duplicate protection active via deterministic Vantage Ticket IDs
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white dark:bg-[#1C2331] text-xs font-semibold text-[#786F66] dark:text-[#94A3B8] border border-[#E7E0D6] dark:border-[#2E384D] cursor-pointer"
            >
              Close
            </button>
            {activeTab === 'paste' && (
              <button
                type="button"
                disabled={newTradesCount === 0 || isImporting}
                onClick={handleImport}
                className="px-5 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed text-[#052E16] text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    Import {newTradesCount} New Trade{newTradesCount !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
