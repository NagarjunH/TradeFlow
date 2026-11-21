import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  ExternalLink,
  Bold,
  Italic,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Eye,
  Minus,
  Check,
  Calendar,
  Cloud,
  CloudOff,
  RefreshCw
} from 'lucide-react';
import type { Trade, AppSettings } from '../db/db';
import type { TabType } from './Navbar';
import { supabase } from '../lib/supabase';
import { notesApi, NOTES_SYNC_DATE } from '../lib/api/notesApi';

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

const getCategoryBadgeStyle = (category: TraderNote['category']) => {
  switch (category) {
    case 'Mindset':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    case 'Strategy':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'Rules':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    case 'Mistakes':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    case 'Session':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    case 'General':
    default:
      return 'bg-[#FAF2E6] dark:bg-[#1C2433] text-[#D97706] border-[#E7E0D6] dark:border-[#2E384D]';
  }
};

const renderInlineMarkdown = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      parts.push(
        <strong key={match.index} className="font-bold text-[#1F1A16] dark:text-[#F0F4F8]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
      parts.push(
        <em key={match.index} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded bg-[#FAF2E6] dark:bg-[#1C2433] text-[#D97706] font-mono text-[11px] border border-[#E7E0D6] dark:border-[#2E384D]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};

interface MarkdownRendererProps {
  content: string;
  isCompact?: boolean;
  onToggleTask?: (lineIndex: number) => void;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  isCompact = false,
  onToggleTask,
}) => {
  if (!content) return null;

  const lines = content.split('\n');

  if (isCompact) {
    const validLines = lines.map((l) => l.trim()).filter((l) => l.length > 0);
    const previewLines = validLines.slice(0, 5);

    return (
      <div className="relative space-y-1 text-xs text-[#5A5043] dark:text-[#CBD5E1] leading-relaxed max-h-32 sm:max-h-36 overflow-hidden">
        {previewLines.map((line, idx) => {
          if (line.startsWith('# ')) {
            return (
              <p key={idx} className="font-black text-[#1F1A16] dark:text-[#F0F4F8] text-[12px] sm:text-[13px] truncate">
                {renderInlineMarkdown(line.replace(/^#\s+/, ''))}
              </p>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <p key={idx} className="font-bold text-[#1F1A16] dark:text-[#F0F4F8] text-[11px] sm:text-[12px] truncate">
                {renderInlineMarkdown(line.replace(/^##\s+/, ''))}
              </p>
            );
          }
          if (line.startsWith('### ')) {
            return (
              <p key={idx} className="font-bold text-[#D97706] text-[10px] sm:text-[11px] truncate">
                {renderInlineMarkdown(line.replace(/^###\s+/, ''))}
              </p>
            );
          }
          if (line.startsWith('- [ ] ') || line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
            const isChecked = line.startsWith('- [x] ') || line.startsWith('- [X] ');
            const taskText = line.replace(/^- \[[ xX]\]\s+/, '');
            return (
              <div key={idx} className="flex items-center gap-1.5 text-[11px] truncate">
                <span className={`w-3 h-3 rounded-xs border flex items-center justify-center shrink-0 ${isChecked ? 'bg-[#10B981] border-[#10B981] text-white' : 'border-[#9E958C]'}`}>
                  {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </span>
                <span className={`truncate ${isChecked ? 'line-through opacity-60' : ''}`}>
                  {renderInlineMarkdown(taskText)}
                </span>
              </div>
            );
          }
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start gap-1.5 text-[11px] truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] mt-1.5 shrink-0" />
                <span className="truncate">{renderInlineMarkdown(line.replace(/^[-*]\s+/, ''))}</span>
              </div>
            );
          }
          if (/^\d+\.\s+/.test(line)) {
            const num = line.match(/^(\d+)\.\s+/)?.[1];
            return (
              <div key={idx} className="flex items-start gap-1.5 text-[11px] truncate">
                <span className="font-mono font-bold text-[#D97706] shrink-0">{num}.</span>
                <span className="truncate">{renderInlineMarkdown(line.replace(/^\d+\.\s+/, ''))}</span>
              </div>
            );
          }
          if (line.startsWith('> ')) {
            return (
              <p key={idx} className="italic border-l-2 border-[#D97706] pl-2 text-[11px] text-[#786F66] dark:text-[#94A3B8] truncate">
                {renderInlineMarkdown(line.replace(/^>\s+/, ''))}
              </p>
            );
          }
          if (line === '---' || line === '***') {
            return <div key={idx} className="border-t border-[#E7E0D6] dark:border-[#242D3D] my-1" />;
          }

          return (
            <p key={idx} className="truncate">
              {renderInlineMarkdown(line)}
            </p>
          );
        })}
        {validLines.length > 3 && (
          <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#FAF6EE] dark:from-[#131822] to-transparent pointer-events-none" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2.5 text-xs sm:text-sm text-[#38312B] dark:text-[#CBD5E1] leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;

        if (trimmed.startsWith('# ')) {
          return (
            <h1
              key={idx}
              className="text-lg sm:text-xl font-black text-[#1F1A16] dark:text-[#F0F4F8] pt-3 pb-1 border-b border-[#E7E0D6] dark:border-[#242D3D]"
            >
              {renderInlineMarkdown(trimmed.replace(/^#\s+/, ''))}
            </h1>
          );
        }

        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={idx}
              className="text-base sm:text-lg font-bold text-[#1F1A16] dark:text-[#F0F4F8] pt-2 pb-0.5"
            >
              {renderInlineMarkdown(trimmed.replace(/^##\s+/, ''))}
            </h2>
          );
        }

        if (trimmed.startsWith('### ')) {
          return (
            <h3
              key={idx}
              className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#D97706] pt-1.5"
            >
              {renderInlineMarkdown(trimmed.replace(/^###\s+/, ''))}
            </h3>
          );
        }

        if (trimmed === '---' || trimmed === '***') {
          return (
            <hr
              key={idx}
              className="my-3 border-t border-[#E7E0D6] dark:border-[#242D3D]"
            />
          );
        }

        if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ')) {
          const isChecked = trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ');
          const taskText = trimmed.replace(/^- \[[ xX]\]\s+/, '');
          return (
            <div
              key={idx}
              onClick={() => onToggleTask?.(idx)}
              className={`flex items-start gap-2.5 p-1.5 rounded-lg transition-colors ${
                onToggleTask ? 'cursor-pointer hover:bg-[#FAF2E6]/60 dark:hover:bg-[#1C2433]/60' : ''
              }`}
            >
              <button
                type="button"
                className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center shrink-0 transition-colors ${
                  isChecked
                    ? 'bg-[#10B981] border border-[#10B981] text-white shadow-2xs'
                    : 'border-2 border-[#9E958C] hover:border-[#D97706] bg-white dark:bg-[#1C2433]'
                }`}
              >
                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
              </button>
              <span className={`select-text ${isChecked ? 'line-through text-[#9E958C] dark:text-[#64748B]' : 'text-[#1F1A16] dark:text-[#F0F4F8]'}`}>
                {renderInlineMarkdown(taskText)}
              </span>
            </div>
          );
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] mt-2 shrink-0" />
              <div className="flex-1 select-text">
                {renderInlineMarkdown(trimmed.replace(/^[-*]\s+/, ''))}
              </div>
            </div>
          );
        }

        if (/^\d+\.\s+/.test(trimmed)) {
          const num = trimmed.match(/^(\d+)\.\s+/)?.[1];
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1">
              <span className="font-mono font-bold text-xs text-[#D97706] mt-0.5 shrink-0">
                {num}.
              </span>
              <div className="flex-1 select-text">
                {renderInlineMarkdown(trimmed.replace(/^\d+\.\s+/, ''))}
              </div>
            </div>
          );
        }

        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={idx}
              className="pl-3.5 py-1.5 my-2 border-l-3 border-[#D97706] bg-[#FAF2E6]/60 dark:bg-[#1C2433]/50 italic rounded-r-xl text-[#5A5043] dark:text-[#CBD5E1]"
            >
              {renderInlineMarkdown(trimmed.replace(/^>\s+/, ''))}
            </blockquote>
          );
        }

        return (
          <p key={idx} className="select-text">
            {renderInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
};

interface NotesViewProps {
  trades?: Trade[];
  settings?: AppSettings;
  onSelectDateForJournal?: (dateStr: string) => void;
  onTabChange?: (tab: TabType) => void;
  selectedDate?: string;
  userId?: string;
}

export const NotesView: React.FC<NotesViewProps> = ({
  trades = [],
  settings,
  onSelectDateForJournal,
  onTabChange,
  selectedDate,
  userId,
}) => {
  const [notes, setNotes] = useState<TraderNote[]>(() => notesApi.getLocal());
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('offline');

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'notebook' | 'trade_notes'>('notebook');
  const [filterByDate, setFilterByDate] = useState<boolean>(Boolean(selectedDate));

  // Automatically sync when selectedDate changes from TopHeader
  useEffect(() => {
    if (selectedDate) {
      setFilterByDate(true);
    }
  }, [selectedDate]);

  // Modal & Reader State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<TraderNote | null>(null);
  const [viewingNote, setViewingNote] = useState<TraderNote | null>(null);
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<TraderNote['category']>('General');
  const [notePinned, setNotePinned] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Initial Cloud Sync on mount / when userId changes
  useEffect(() => {
    let isMounted = true;

    const performSync = async () => {
      if (!userId || userId === '00000000-0000-0000-0000-000000000000') {
        if (isMounted) setSyncStatus('offline');
        return;
      }

      if (isMounted) setSyncStatus('syncing');
      try {
        const res = await notesApi.sync(userId);
        if (isMounted) {
          setNotes(res.notes);
          setSyncStatus(res.synced ? 'synced' : 'offline');
        }
      } catch (err) {
        console.warn('[NotesView] Cloud sync error:', err);
        if (isMounted) setSyncStatus('offline');
      }
    };

    performSync();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // 2. Realtime subscription: Laptop <-> Mobile live updates
  useEffect(() => {
    if (!userId || userId === '00000000-0000-0000-0000-000000000000') return;

    const channel = supabase
      .channel(`realtime-notes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_records',
          filter: `record_date=eq.${NOTES_SYNC_DATE}`,
        },
        async () => {
          try {
            const cloudNotes = await notesApi.getCloud(userId);
            if (cloudNotes && cloudNotes.length > 0) {
              setNotes(cloudNotes);
              notesApi.saveLocal(cloudNotes);
              setSyncStatus('synced');
            }
          } catch (err) {
            console.warn('[NotesView] Realtime sync error:', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Manual sync trigger
  const handleManualSync = useCallback(async () => {
    if (!userId || userId === '00000000-0000-0000-0000-000000000000') {
      alert('Sign in to your TradeFlow account to automatically sync notes across Laptop & Mobile.');
      return;
    }
    setSyncStatus('syncing');
    try {
      const res = await notesApi.sync(userId);
      setNotes(res.notes);
      setSyncStatus(res.synced ? 'synced' : 'offline');
    } catch {
      setSyncStatus('offline');
    }
  }, [userId]);

  // Escape key closes active modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewingNote) setViewingNote(null);
        else if (isEditorOpen) setIsEditorOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingNote, isEditorOpen]);

  const categories = ['All', 'Mindset', 'Strategy', 'Rules', 'Mistakes', 'Session', 'General'] as const;

  // Filtered personal notes
  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        const matchesCat = activeCategory === 'All' || n.category === activeCategory;
        const matchesDate = !filterByDate || !selectedDate || n.date === selectedDate;
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery = !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
        return matchesCat && matchesDate && matchesQuery;
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [notes, activeCategory, searchQuery, filterByDate, selectedDate]);

  // Notes from actual trades in Journal
  const tradeNotesList = useMemo(() => {
    return trades
      .filter((t) => t.notes && t.notes.trim().length > 0)
      .filter((t) => !filterByDate || !selectedDate || t.date === selectedDate)
      .sort((a, b) => (b.tradeNumber || 0) - (a.tradeNumber || 0));
  }, [trades, filterByDate, selectedDate]);

  const handleOpenNewNote = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteCategory('General');
    setNotePinned(false);
    setEditorTab('write');
    setIsEditorOpen(true);
  };

  const handleOpenEditNote = (note: TraderNote) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteCategory(note.category);
    setNotePinned(!!note.isPinned);
    setEditorTab('write');
    setIsEditorOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() && !noteContent.trim()) return;

    const today = selectedDate || new Date().toISOString().split('T')[0];
    let savedNote: TraderNote;
    let nextNotes: TraderNote[];

    if (editingNote) {
      savedNote = {
        ...editingNote,
        title: noteTitle.trim() || 'Untitled Note',
        content: noteContent.trim(),
        category: noteCategory,
        isPinned: notePinned,
        updatedAt: today,
      };
      nextNotes = notes.map((n) => (n.id === savedNote.id ? savedNote : n));
    } else {
      savedNote = {
        id: `note-${Date.now()}`,
        title: noteTitle.trim() || 'Untitled Note',
        content: noteContent.trim(),
        category: noteCategory,
        isPinned: notePinned,
        date: today,
      };
      nextNotes = [savedNote, ...notes];
    }

    setNotes(nextNotes);
    notesApi.saveLocal(nextNotes);
    setIsEditorOpen(false);
    setViewingNote(savedNote);

    // Push to Supabase Cloud
    if (userId && userId !== '00000000-0000-0000-0000-000000000000') {
      setSyncStatus('syncing');
      const ok = await notesApi.saveCloud(userId, nextNotes);
      setSyncStatus(ok ? 'synced' : 'offline');
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (window.confirm('Delete this note?')) {
      const nextNotes = notes.filter((n) => n.id !== id);
      setNotes(nextNotes);
      notesApi.saveLocal(nextNotes);
      if (viewingNote?.id === id) {
        setViewingNote(null);
      }
      if (userId && userId !== '00000000-0000-0000-0000-000000000000') {
        setSyncStatus('syncing');
        const ok = await notesApi.saveCloud(userId, nextNotes);
        setSyncStatus(ok ? 'synced' : 'offline');
      }
    }
  };

  const handleTogglePin = async (id: string) => {
    const nextNotes = notes.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n));
    setNotes(nextNotes);
    notesApi.saveLocal(nextNotes);
    if (viewingNote?.id === id) {
      setViewingNote((prev) => prev ? { ...prev, isPinned: !prev.isPinned } : null);
    }
    if (userId && userId !== '00000000-0000-0000-0000-000000000000') {
      const ok = await notesApi.saveCloud(userId, nextNotes);
      setSyncStatus(ok ? 'synced' : 'offline');
    }
  };

  const handleToggleViewingNoteTask = async (lineIndex: number) => {
    if (!viewingNote) return;

    const lines = viewingNote.content.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return;

    const targetLine = lines[lineIndex];
    if (targetLine.trim().startsWith('- [ ] ')) {
      lines[lineIndex] = targetLine.replace('- [ ] ', '- [x] ');
    } else if (targetLine.trim().startsWith('- [x] ') || targetLine.trim().startsWith('- [X] ')) {
      lines[lineIndex] = targetLine.replace(/- \[[xX]\] /, '- [ ] ');
    } else {
      return;
    }

    const updatedContent = lines.join('\n');
    const updatedNote: TraderNote = {
      ...viewingNote,
      content: updatedContent,
    };

    const nextNotes = notes.map((n) => (n.id === updatedNote.id ? updatedNote : n));
    setViewingNote(updatedNote);
    setNotes(nextNotes);
    notesApi.saveLocal(nextNotes);

    if (userId && userId !== '00000000-0000-0000-0000-000000000000') {
      await notesApi.saveCloud(userId, nextNotes);
    }
  };

  const insertFormat = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const selectedText = text.substring(start, end) || defaultText;
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setNoteContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 0);
  };

  const insertLinePrefix = (prefix: string, defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const text = textarea.value;

    const lastNewline = text.lastIndexOf('\n', start - 1);
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

    const beforeLine = text.substring(0, lineStart);
    const afterLineStart = text.substring(lineStart);

    let newContent: string;
    let newCursor: number;

    if (afterLineStart.startsWith(prefix)) {
      newContent = beforeLine + afterLineStart.substring(prefix.length);
      newCursor = Math.max(lineStart, start - prefix.length);
    } else {
      const lineEnd = text.indexOf('\n', start);
      const lineContent = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);
      if (!lineContent.trim() && defaultText) {
        newContent = beforeLine + prefix + defaultText + (lineEnd === -1 ? '' : text.substring(lineEnd));
        newCursor = lineStart + prefix.length + defaultText.length;
      } else {
        newContent = beforeLine + prefix + afterLineStart;
        newCursor = start + prefix.length;
      }
    }

    setNoteContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  const currSymbol = settings?.currency === 'USD' ? '$' : '₹';

  return (
    <div className="space-y-6 animate-fade-in pb-16 text-[#1F1A16] dark:text-[#F0F4F8]">
      {/* 1. Header Banner */}
      <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] sm:text-xs font-mono tracking-widest text-[#D97706] uppercase font-bold">
              KNOWLEDGE • PLAYBOOK • JOURNAL
            </span>
          </div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#1F1A16] dark:text-[#F0F4F8] mt-1">
            Trading Notes & Playbook
          </h1>
          <p className="text-xs sm:text-sm text-[#786F66] dark:text-[#94A3B8] mt-1">
            Capture psychological insights, market observations, lessons learned, and trade debriefs.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          {/* Cloud Sync Status */}
          {syncStatus === 'syncing' && (
            <span className="flex items-center gap-1.5 text-xs font-mono text-[#D97706] bg-[#FAF2E6] dark:bg-[#1C2433] px-3 py-2 rounded-xl border border-[#E7E0D6] dark:border-[#2E384D] animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Syncing...</span>
            </span>
          )}
          {syncStatus === 'synced' && (
            <button
              type="button"
              onClick={handleManualSync}
              className="flex items-center gap-1.5 text-xs font-mono text-[#10B981] bg-[#10B981]/10 px-3 py-2 rounded-xl border border-[#10B981]/25 hover:bg-[#10B981]/20 transition-all cursor-pointer"
              title="Click to manually re-sync notes with Supabase cloud"
            >
              <Cloud className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Cloud Synced</span>
            </button>
          )}
          {syncStatus === 'offline' && (
            <button
              type="button"
              onClick={handleManualSync}
              className="flex items-center gap-1.5 text-xs font-mono text-[#786F66] dark:text-[#94A3B8] bg-[#FAF2E6] dark:bg-[#1C2433] px-3 py-2 rounded-xl border border-[#E7E0D6] dark:border-[#2E384D] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8] transition-all cursor-pointer"
              title="Offline / Local storage. Click to sync if signed in"
            >
              <CloudOff className="w-3.5 h-3.5" />
              <span>Local Mode</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenNewNote}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            New Note
          </button>
        </div>
      </div>

      {/* 2. Mode Selector & Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Notebook vs Trade Notes Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
          <div className="flex items-center bg-[#FAF6EE] dark:bg-[#131822] p-1 rounded-xl border border-[#E7E0D6] dark:border-[#242D3D] text-xs font-bold w-full sm:w-fit">
            <button
              type="button"
              onClick={() => setViewMode('notebook')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'notebook'
                  ? 'bg-[#DB9F35] text-[#1F1A16] font-black shadow-2xs'
                  : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Playbook ({notes.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('trade_notes')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'trade_notes'
                  ? 'bg-[#DB9F35] text-[#1F1A16] font-black shadow-2xs'
                  : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Trade Feed ({tradeNotesList.length})</span>
            </button>
          </div>

          {selectedDate && (
            <button
              type="button"
              onClick={() => setFilterByDate(!filterByDate)}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer w-full sm:w-auto ${
                filterByDate
                  ? 'bg-[#10B981] text-white border-[#10B981] shadow-2xs'
                  : 'bg-[#FAF6EE] dark:bg-[#131822] border-[#E7E0D6] dark:border-[#242D3D] text-[#786F66] dark:text-[#94A3B8] hover:border-[#10B981]'
              }`}
              title="Toggle to filter notes by the selected top date"
            >
              <span>📅 {selectedDate}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                filterByDate ? 'bg-black/25 text-white' : 'bg-[#E7E0D6] dark:bg-[#242D3D]'
              }`}>
                {filterByDate ? 'Filtered' : 'Filter by Day'}
              </span>
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:max-w-xs lg:max-w-sm">
          <Search className="w-4 h-4 text-[#9E958C] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notes, rules, lessons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-xl text-xs text-[#1F1A16] dark:text-[#F0F4F8] placeholder-[#9E958C] outline-none focus:border-[#DB9F35] transition-colors"
          />
        </div>
      </div>

      {/* Category Pills (only in notebook mode, horizontally scrollable on mobile) */}
      {viewMode === 'notebook' && (
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border shrink-0 ${
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 items-start">
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
                onClick={() => setViewingNote(note)}
                className={`bg-[#FAF6EE] dark:bg-[#131822] border rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col transition-all hover:shadow-md cursor-pointer hover:border-[#D97706]/70 group ${
                  note.isPinned
                    ? 'border-[#DB9F35] ring-1 ring-[#DB9F35]/40'
                    : 'border-[#E7E0D6] dark:border-[#242D3D]'
                }`}
              >
                <div>
                  {/* Card Header: Category badge + Pin + Actions */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E7E0D6]/60 dark:border-[#242D3D]">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getCategoryBadgeStyle(note.category)}`}>
                        {note.category}
                      </span>
                      {note.isPinned && (
                        <Pin className="w-3 h-3 text-[#D97706] fill-current" />
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePin(note.id);
                        }}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditNote(note);
                        }}
                        className="p-1.5 rounded-lg text-[#9E958C] hover:text-[#1F1A16] hover:bg-[#FAF2E6] dark:hover:bg-[#1E2638] transition-colors cursor-pointer"
                        title="Edit note"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                        className="p-1.5 rounded-lg text-[#9E958C] hover:text-[#DC2626] hover:bg-[#FAF2E6] dark:hover:bg-[#1E2638] transition-colors cursor-pointer"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Body */}
                  <h3 className="text-sm font-black text-[#1F1A16] dark:text-[#F0F4F8] mt-3 group-hover:text-[#D97706] transition-colors">
                    {note.title}
                  </h3>
                  <div className="mt-2.5">
                    <MarkdownRenderer content={note.content} isCompact={true} />
                  </div>
                </div>

                {/* Footer: Date */}
                <div className="pt-3.5 mt-3 border-t border-[#E7E0D6]/60 dark:border-[#242D3D] flex items-center justify-between text-[10px] font-mono text-[#9E958C] dark:text-[#64748B]">
                  <span>{note.date}</span>
                  {note.updatedAt ? (
                    <span>Edited {note.updatedAt}</span>
                  ) : (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#D97706] font-bold">
                      Click to read →
                    </span>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-fade-in">
          <div className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl sm:rounded-3xl p-4 sm:p-7 max-w-xl w-full max-h-[92vh] sm:max-h-[88vh] overflow-y-auto shadow-2xl space-y-3.5 sm:space-y-4">
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
                className="p-1.5 rounded-lg text-[#9E958C] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-3.5 sm:space-y-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
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

                <div className="flex items-center sm:items-end pb-1">
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

              {/* Content Header + Tabs */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-[#786F66] dark:text-[#94A3B8] uppercase tracking-wider">
                    Content / Instructions / Notes
                  </label>
                  <div className="flex items-center bg-[#FAF2E6] dark:bg-[#1C2433] p-0.5 rounded-lg border border-[#E7E0D6] dark:border-[#2E384D] text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setEditorTab('write')}
                      className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                        editorTab === 'write'
                          ? 'bg-white dark:bg-[#242D3D] text-[#1F1A16] dark:text-[#F0F4F8] shadow-2xs'
                          : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16]'
                      }`}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab('preview')}
                      className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                        editorTab === 'preview'
                          ? 'bg-white dark:bg-[#242D3D] text-[#1F1A16] dark:text-[#F0F4F8] shadow-2xs'
                          : 'text-[#786F66] dark:text-[#94A3B8] hover:text-[#1F1A16]'
                      }`}
                    >
                      <Eye className="w-3 h-3" /> Preview
                    </button>
                  </div>
                </div>

                {/* Formatting Toolbar (Horizontal scroll on mobile so it stays on 1 clean row) */}
                {editorTab === 'write' && (
                  <div className="flex items-center gap-1 p-1.5 bg-[#FAF2E6] dark:bg-[#1C2433] border border-[#E7E0D6] dark:border-[#2E384D] rounded-xl text-xs overflow-x-auto no-scrollbar shrink-0">
                    {/* Headings */}
                    <button
                      type="button"
                      onClick={() => insertLinePrefix('# ', 'Heading 1')}
                      className="px-2 py-1 rounded hover:bg-white dark:hover:bg-[#242D3D] text-[#1F1A16] dark:text-[#F0F4F8] font-black text-xs transition-colors cursor-pointer shrink-0"
                      title="Headline 1 (# Title)"
                    >
                      H1
                    </button>
                    <button
                      type="button"
                      onClick={() => insertLinePrefix('## ', 'Heading 2')}
                      className="px-2 py-1 rounded hover:bg-white dark:hover:bg-[#242D3D] text-[#1F1A16] dark:text-[#F0F4F8] font-bold text-xs transition-colors cursor-pointer shrink-0"
                      title="Headline 2 (## Subheading)"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() => insertLinePrefix('### ', 'Heading 3')}
                      className="px-2 py-1 rounded hover:bg-white dark:hover:bg-[#242D3D] text-[#D97706] font-bold text-xs transition-colors cursor-pointer shrink-0"
                      title="Headline 3 (### Section)"
                    >
                      H3
                    </button>

                    <div className="w-[1px] h-4 bg-[#E7E0D6] dark:bg-[#2E384D] mx-0.5 shrink-0" />

                    {/* Inline Formatting */}
                    <button
                      type="button"
                      onClick={() => insertFormat('**', '**', 'bold text')}
                      className="p-1.5 rounded hover:bg-white dark:hover:bg-[#242D3D] text-[#1F1A16] dark:text-[#F0F4F8] transition-colors cursor-pointer shrink-0"
                      title="Bold (**text**)"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormat('*', '*', 'italic text')}
                      className="p-1.5 rounded hover:bg-white dark:hover:bg-[#242D3D] text-[#1F1A16] dark:text-[#F0F4F8] transition-colors cursor-pointer shrink-0"
                      title="Italic (*text*)"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-[1px] h-4 bg-[#E7E0D6] dark:bg-[#2E384D] mx-0.5 shrink-0" />

                    {/* Lists & Checklists */}
                    <button
                      type="button"
                      onClick={() => insertLinePrefix('- ', 'List item')}
                      className="p-1.5 rounded hover:bg-white dark:hover:bg-[#242D3D] text-[#1F1A16] dark:text-[#F0F4F8] transition-colors cursor-pointer shrink-0"
                      title="Bullet List (- item)"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertLinePrefix('1. ', 'Numbered item')}
                      className="p-1.5 rounded hover:bg-white dark:hover:bg-[#242D3D] text-[#1F1A16] dark:text-[#F0F4F8] transition-colors cursor-pointer shrink-0"
                      title="Numbered List (1. item)"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertLinePrefix('- [ ] ', 'Checklist task')}
                      className="p-1.5 rounded hover:bg-white dark:hover:bg-[#242D3D] text-[#1F1A16] dark:text-[#F0F4F8] transition-colors cursor-pointer shrink-0"
                      title="Checklist (- [ ] task)"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-[#10B981]" />
                    </button>

                    <div className="w-[1px] h-4 bg-[#E7E0D6] dark:bg-[#2E384D] mx-0.5 shrink-0" />

                    {/* Quote & Divider */}
                    <button
                      type="button"
                      onClick={() => insertLinePrefix('> ', 'Key takeaway or quote')}
                      className="p-1.5 rounded hover:bg-white dark:hover:bg-[#242D3D] text-[#1F1A16] dark:text-[#F0F4F8] transition-colors cursor-pointer shrink-0"
                      title="Quote (> quote)"
                    >
                      <Quote className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormat('\n---\n')}
                      className="p-1.5 rounded hover:bg-white dark:hover:bg-[#242D3D] text-[#1F1A16] dark:text-[#F0F4F8] transition-colors cursor-pointer shrink-0"
                      title="Divider line (---)"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {editorTab === 'write' ? (
                  <textarea
                    ref={textareaRef}
                    rows={7}
                    required
                    placeholder="Write your setup checklist, mental cues, emotional triggers, or playbook rules..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#1C2433] border border-[#DFD5C6] dark:border-[#2E384D] rounded-xl text-xs text-[#1F1A16] dark:text-[#F0F4F8] outline-none focus:border-[#D97706] resize-none leading-relaxed font-mono"
                  />
                ) : (
                  <div className="min-h-[170px] max-h-[240px] overflow-y-auto px-4 py-3 bg-white dark:bg-[#1C2433] border border-[#DFD5C6] dark:border-[#2E384D] rounded-xl">
                    {noteContent.trim() ? (
                      <MarkdownRenderer content={noteContent} isCompact={false} />
                    ) : (
                      <p className="text-xs text-[#9E958C] italic">Nothing to preview yet. Switch back to Write tab to add notes.</p>
                    )}
                  </div>
                )}
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

      {/* 6. Note Reader Modal (Formatted typography with corner Edit button) */}
      {viewingNote && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-fade-in"
          onClick={() => setViewingNote(null)}
        >
          <div
            className="bg-[#FAF6EE] dark:bg-[#131822] border border-[#E7E0D6] dark:border-[#242D3D] rounded-2xl sm:rounded-3xl p-4 sm:p-7 max-w-2xl w-full max-h-[92vh] sm:max-h-[88vh] overflow-hidden flex flex-col shadow-2xl transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar with Category, Dates, and Corner Edit / Close */}
            <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-[#E7E0D6] dark:border-[#242D3D] shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getCategoryBadgeStyle(
                    viewingNote.category
                  )}`}
                >
                  {viewingNote.category}
                </span>
                {viewingNote.isPinned && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-[#D97706] bg-[#FAF2E6] dark:bg-[#1C2433] px-1.5 py-0.5 rounded-md border border-[#E7E0D6] dark:border-[#2E384D]">
                    <Pin className="w-3 h-3 fill-current" /> Pinned
                  </span>
                )}
                <span className="flex items-center gap-1 text-[10px] font-mono text-[#786F66] dark:text-[#94A3B8]">
                  <Calendar className="w-3 h-3 opacity-70" /> {viewingNote.date}
                </span>
              </div>

              {/* Corner Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const noteToEdit = viewingNote;
                    setViewingNote(null);
                    handleOpenEditNote(noteToEdit);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="Edit this note"
                >
                  <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Edit Note</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingNote(null)}
                  className="p-1.5 rounded-xl text-[#9E958C] hover:text-[#1F1A16] dark:hover:text-[#F0F4F8] hover:bg-[#FAF2E6] dark:hover:bg-[#1E2638] transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Note Content */}
            <div className="overflow-y-auto py-4 sm:py-5 pr-1 space-y-3 sm:space-y-4 flex-1">
              <h2 className="text-lg sm:text-2xl font-black text-[#1F1A16] dark:text-[#F0F4F8] tracking-tight">
                {viewingNote.title}
              </h2>
              <div className="pt-2 border-t border-[#E7E0D6]/60 dark:border-[#242D3D]">
                <MarkdownRenderer
                  content={viewingNote.content}
                  isCompact={false}
                  onToggleTask={handleToggleViewingNoteTask}
                />
              </div>
            </div>

            {/* Modal Bottom Bar */}
            <div className="pt-3 border-t border-[#E7E0D6] dark:border-[#242D3D] flex items-center justify-between text-xs text-[#786F66] dark:text-[#94A3B8] shrink-0">
              <span className="text-[10px] sm:text-[11px] font-mono truncate">
                {viewingNote.updatedAt ? `Edited ${viewingNote.updatedAt}` : `Created ${viewingNote.date}`}
              </span>
              <button
                type="button"
                onClick={() => setViewingNote(null)}
                className="px-4 py-1.5 rounded-xl bg-[#FAF2E6] dark:bg-[#1C2433] hover:bg-[#E7E0D6] dark:hover:bg-[#2E384D] text-[#1F1A16] dark:text-[#F0F4F8] font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
