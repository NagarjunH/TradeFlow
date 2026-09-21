import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Pin,
  Trash2,
  Edit3,
  BookOpen,
  ArrowRight,
  X,
  ExternalLink
} from 'lucide-react';
import type { Trade, AppSettings } from '../db/db';
import type { TabType } from './Navbar';

export interface TraderNote {
  id: string;
  title: string;
  content: string;
  category: 'Mindset' | 'Strategy' | 'Mistakes' | 'Session' | 'Rules' | 'General';
  isPinned?: boolean;
  date: string;
  updatedAt?: string;
  linkedTradeId?: number;
}

const STORAGE_KEY = 'nh_traders_personal_notes_v1';

const INITIAL_NOTES: TraderNote[] = [
  {
    id: 'note-1',
    title: 'Post-Loss Protocol: Reset Nervous System',
    content: 'Whenever a trade hits stop loss, do NOT immediately look for another entry. Step away from charts for at least 15 minutes. High emotions lead to revenge trading. Wait for clear HTF structure to re-establish.',
    category: 'Mindset',
    isPinned: true,
    date: '2026-09-20',
  },
  {
    id: 'note-2',
    title: 'London Open SMC Confirmation Rules',
    content: 'Only take trades after the Asian high or low has been swept. Look for M5 MSS (Market Structure Shift) with displacement leaving a clean Fair Value Gap (FVG). Stop loss must always be beyond the swing extreme.',
    category: 'Strategy',
    isPinned: true,
    date: '2026-09-18',
  },
  {
    id: 'note-3',
    title: 'High-Impact Red Folder News Rule',
    content: 'Do NOT hold open trades through CPI, NFP, or FOMC interest rate announcements. Spread widening can trigger stop loss prematurely. Wait 15 minutes post-release before assessing new setups.',
    category: 'Rules',
    isPinned: false,
    date: '2026-09-15',
  },
];

interface NotesViewProps {
  trades?: Trade[];
  settings?: AppSettings;
  onSelectDateForJournal?: (dateStr: string) => void;
  onTabChange?: (tab: TabType) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  trades = [],
  settings,
  onSelectDateForJournal,
  onTabChange,
}) => {
  const [notes, setNotes] = useState<TraderNote[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_NOTES;
  });

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'notebook' | 'trade_notes'>('notebook');

  // Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<TraderNote | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<TraderNote['category']>('General');
  const [notePinned, setNotePinned] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch {
      // ignore
    }
  }, [notes]);

  const categories = ['All', 'Mindset', 'Strategy', 'Rules', 'Mistakes', 'Session', 'General'] as const;

  // Filtered personal notes
  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        const matchesCat = activeCategory === 'All' || n.category === activeCategory;
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery = !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
        return matchesCat && matchesQuery;
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [notes, activeCategory, searchQuery]);

  // Notes from actual trades in Journal
  const tradeNotesList = useMemo(() => {
    return trades
      .filter((t) => t.notes && t.notes.trim().length > 0)
      .sort((a, b) => (b.tradeNumber || 0) - (a.tradeNumber || 0));
  }, [trades]);

  const handleOpenNewNote = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteCategory('General');
    setNotePinned(false);
    setIsEditorOpen(true);
  };

  const handleOpenEditNote = (note: TraderNote) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteCategory(note.category);
    setNotePinned(!!note.isPinned);
    setIsEditorOpen(true);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() && !noteContent.trim()) return;

    const today = new Date().toISOString().split('T')[0];

    if (editingNote) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === editingNote.id
            ? {
                ...n,
                title: noteTitle.trim() || 'Untitled Note',
                content: noteContent.trim(),
                category: noteCategory,
                isPinned: notePinned,
                updatedAt: today,
              }
            : n
        )
      );
    } else {
      const newNote: TraderNote = {
        id: `note-${Date.now()}`,
        title: noteTitle.trim() || 'Untitled Note',
        content: noteContent.trim(),
        category: noteCategory,
        isPinned: notePinned,
        date: today,
      };
      setNotes((prev) => [newNote, ...prev]);
    }

    setIsEditorOpen(false);
  };

  const handleDeleteNote = (id: string) => {
    if (window.confirm('Delete this note?')) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handleTogglePin = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n))
    );
  };

  const currSymbol = settings?.currency === 'USD' ? '$' : '₹';

  return (
    <div className="space-y-6 animate-fade-in pb-16 text-[#1F1A16] dark:text-[#F0F4F8]">
      {/* 1. Header Banner */}
      <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono tracking-widest text-[#D97706] uppercase font-bold">
              KNOWLEDGE • PLAYBOOK • JOURNAL
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8] mt-1">
            Trading Notes & Playbook
          </h1>
          <p className="text-xs sm:text-sm text-[#786F66] dark:text-[#94A3B8] mt-1">
            Capture psychological insights, market observations, lessons learned, and trade debriefs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenNewNote}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            New Note
          </button>
        </div>
      </div>

      {/* 2. Mode Selector & Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Notebook vs Trade Notes Tabs */}
        <div className="flex items-center bg-[#FAF6EE] dark:bg-[#131822] p-1 rounded-xl border border-[#E7E0D6] dark:border-[#242D3D] text-xs font-bold w-fit">
          <button
            type="button"
            onClick={() => setViewMode('notebook')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'notebook'
                ? 'bg-[#DB9F35] text-[#1F1A16] font-black shadow-2xs'
                : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Playbook Notes ({notes.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('trade_notes')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'trade_notes'
                ? 'bg-[#DB9F35] text-[#1F1A16] font-black shadow-2xs'
                : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Trade Notes Feed ({tradeNotesList.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#9E958C] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notes, rules, psychological lessons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl text-xs text-[#1F1A16] dark:text-[#F0F4F8] placeholder-[#9E958C] outline-none focus:border-[#DB9F35] transition-colors"
          />
        </div>
      </div>

      {/* Category Pills (only in notebook mode) */}
      {viewMode === 'notebook' && (
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                activeCategory === cat
                  ? 'bg-[#1F1A16] text-white border-[#1F1A16] dark:bg-[#F0F4F8] dark:text-[#1F1A16] dark:border-[#F0F4F8]'
                  : 'bg-[#FAF6EE] dark:bg-[#131822] text-[#786F66] dark:text-[#94A3B8] border-[#E7E0D6] dark:border-[#242D3D] hover:text-[#1F1A16]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* 3. Main Content: Playbook Notes Grid */}
      {viewMode === 'notebook' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl">
              <FileText className="w-10 h-10 text-[#9E958C] mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                No notes found
              </h3>
              <p className="text-xs text-[#786F66] dark:text-[#94A3B8] mt-1 max-w-sm mx-auto">
                Create a new playbook note or adjust your search filters.
              </p>
              <button
                type="button"
                onClick={handleOpenNewNote}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#D97706] text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add First Note
              </button>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                className={`bg-[#FAF6EE] dark:bg-[#131822] border rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-all hover:shadow-sm ${
                  note.isPinned
                    ? 'border-[#DB9F35] ring-1 ring-[#DB9F35]/40'
                    : 'border-[#E7E0D6] dark:border-[#242D3D]'
                }`}
              >
                <div>
                  {/* Card Header: Category badge + Pin + Actions */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#FAF2E6] dark:bg-[#1C2433] text-[#D97706] border border-[#E7E0D6] dark:border-[#2E384D]">
                        {note.category}
                      </span>
                      {note.isPinned && (
                        <Pin className="w-3 h-3 text-[#D97706] fill-current" />
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(note.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          note.isPinned
                            ? 'text-[#D97706] hover:bg-[#FAF2E6] dark:hover:bg-[#1E2638]'
                            : 'text-[#9E958C] hover:text-[#1F1A16] hover:bg-[#FAF2E6] dark:hover:bg-[#1E2638]'
                        }`}
                        title={note.isPinned ? 'Unpin note' : 'Pin note to top'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditNote(note)}
                        className="p-1.5 rounded-lg text-[#9E958C] hover:text-[#1F1A16] hover:bg-[#FAF2E6] dark:hover:bg-[#1E2638] transition-colors cursor-pointer"
                        title="Edit note"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1.5 rounded-lg text-[#9E958C] hover:text-[#DC2626] hover:bg-[#FAF2E6] dark:hover:bg-[#1E2638] transition-colors cursor-pointer"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Body */}
                  <h3 className="text-sm font-black text-[#1F1A16] dark:text-[#F0F4F8] mt-3">
                    {note.title}
                  </h3>
                  <p className="text-xs text-[#5A5043] dark:text-[#CBD5E1] mt-2 whitespace-pre-wrap leading-relaxed line-clamp-6">
                    {note.content}
                  </p>
                </div>

                {/* Footer: Date */}
                <div className="pt-4 mt-3 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] flex items-center justify-between text-[10px] font-mono text-[#9E958C] dark:text-[#64748B]">
                  <span>{note.date}</span>
                  {note.updatedAt && (
                    <span>Edited {note.updatedAt}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 4. Trade Notes Feed (Consolidated notes from trades in Journal) */}
      {viewMode === 'trade_notes' && (
        <div className="space-y-3">
          {tradeNotesList.length === 0 ? (
            <div className="py-16 text-center bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl">
              <BookOpen className="w-10 h-10 text-[#9E958C] mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                No trade execution notes logged yet
              </h3>
              <p className="text-xs text-[#786F66] dark:text-[#94A3B8] mt-1 max-w-sm mx-auto">
                When recording or editing trades in your journal, add notes in the Trade Notes field and they will aggregate here.
              </p>
              <button
                type="button"
                onClick={() => onTabChange?.('journal')}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#D97706] text-white text-xs font-bold cursor-pointer"
              >
                Go to Trading Journal <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            tradeNotesList.map((t) => (
              <div
                key={t.id || t.tradeNumber}
                className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-colors"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black font-mono px-2 py-0.5 rounded bg-[#FAF2E6] dark:bg-[#1C2433] text-[#1F1A16] dark:text-[#F0F4F8] border border-[#E7E0D6] dark:border-[#2E384D]">
                      Trade #{t.tradeNumber}
                    </span>
                    <span className="text-xs font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
                      {t.pair}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        t.order === 'BUY'
                          ? 'bg-[#10B981]/15 text-[#10B981]'
                          : 'bg-[#EF4444]/15 text-[#EF4444]'
                      }`}
                    >
                      {t.order}
                    </span>
                    <span className="text-[10px] font-mono text-[#786F66] dark:text-[#94A3B8]">
                      {t.date} {t.time}
                    </span>
                    <span
                      className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                        t.rMultiple >= 0
                          ? 'bg-[#10B981]/15 text-[#10B981]'
                          : 'bg-[#EF4444]/15 text-[#EF4444]'
                      }`}
                    >
                      {t.rMultiple >= 0 ? '+' : ''}{t.rMultiple}R ({currSymbol}{t.pnl.toFixed(2)})
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-[#1F1A16] dark:text-[#F0F4F8] whitespace-pre-wrap leading-relaxed pl-1 border-l-2 border-[#D97706]/60">
                    {t.notes}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onSelectDateForJournal?.(t.date);
                    onTabChange?.('journal');
                  }}
                  className="self-start text-[11px] font-bold text-[#D97706] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                >
                  View in Journal <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 5. Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D6] dark:border-[#242D3D]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#D97706]" />
                <h3 className="text-base font-black text-[#1F1A16] dark:text-[#F0F4F8]">
                  {editingNote ? 'Edit Playbook Note' : 'Create Playbook Note'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-1 rounded-lg text-[#9E958C] hover:text-[#1F1A16] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-[11px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Protocol for High Volatility Sessions"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#1C2433] border border-[#DFD5C6] dark:border-[#2E384D] rounded-xl text-xs font-semibold text-[#1F1A16] dark:text-[#F0F4F8] outline-none focus:border-[#D97706]"
                />
              </div>

              {/* Category & Pin */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value as TraderNote['category'])}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1C2433] border border-[#DFD5C6] dark:border-[#2E384D] rounded-xl text-xs font-semibold text-[#1F1A16] dark:text-[#F0F4F8] outline-none cursor-pointer"
                  >
                    <option value="Mindset">Mindset</option>
                    <option value="Strategy">Strategy</option>
                    <option value="Rules">Rules</option>
                    <option value="Mistakes">Mistakes</option>
                    <option value="Session">Session</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#1F1A16] dark:text-[#F0F4F8] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={notePinned}
                      onChange={(e) => setNotePinned(e.target.checked)}
                      className="w-4 h-4 rounded text-[#D97706] focus:ring-[#D97706] cursor-pointer"
                    />
                    <span>Pin to top</span>
                  </label>
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-[11px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider mb-1">
                  Content / Instructions / Notes
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Write your setup checklist, mental cues, emotional triggers to avoid, or observations..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#1C2433] border border-[#DFD5C6] dark:border-[#2E384D] rounded-xl text-xs text-[#1F1A16] dark:text-[#F0F4F8] outline-none focus:border-[#D97706] resize-none leading-relaxed"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E0D6] dark:border-[#242D3D]">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#786F66] dark:text-[#94A3B8] hover:bg-[#FAF2E6] dark:hover:bg-[#1E2638] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
