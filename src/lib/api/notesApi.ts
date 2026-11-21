// ============================================================
// TradeFlow — Realtime Supabase Cloud Notes Sync API
// ============================================================
import { supabase } from '../supabase';
import type { TraderNote } from '../../components/NotesView';

export const NOTES_STORAGE_KEY = 'nh_traders_personal_notes_v1';
export const NOTES_SYNC_DATE = '1970-01-01';

export const INITIAL_NOTES: TraderNote[] = [
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

export const notesApi = {
  getLocal(): TraderNote[] {
    try {
      const saved = localStorage.getItem(NOTES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('[notesApi] getLocal error:', e);
    }
    return INITIAL_NOTES;
  },

  saveLocal(notes: TraderNote[]): void {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
      console.warn('[notesApi] saveLocal error:', e);
    }
  },

  async getCloud(userId: string): Promise<TraderNote[] | null> {
    if (!userId || userId === '00000000-0000-0000-0000-000000000000') return null;

    try {
      const { data, error } = (await supabase
        .from('daily_records')
        .select('rules_json, closing_notes')
        .eq('user_id', userId)
        .eq('record_date', NOTES_SYNC_DATE)
        .maybeSingle()) as { data: { rules_json: any; closing_notes: string | null } | null; error: any };

      if (error) {
        console.warn('[notesApi] getCloud warning:', error.message);
        return null;
      }

      if (!data) return null;

      // Extract from rules_json.personal_notes or fallback to closing_notes
      const rules = data.rules_json || {};
      if (Array.isArray(rules.personal_notes) && rules.personal_notes.length > 0) {
        return rules.personal_notes;
      }

      if (data.closing_notes) {
        try {
          const parsed = JSON.parse(data.closing_notes);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (_) {}
      }
    } catch (err) {
      console.warn('[notesApi] getCloud failed:', err);
    }
    return null;
  },

  async saveCloud(userId: string, notes: TraderNote[]): Promise<boolean> {
    if (!userId || userId === '00000000-0000-0000-0000-000000000000') return false;

    try {
      const payload = {
        user_id: userId,
        record_date: NOTES_SYNC_DATE,
        cycle_day: 0,
        is_no_trade_day: false,
        rules_json: { personal_notes: notes },
        closing_notes: JSON.stringify(notes),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('daily_records')
        .upsert(payload as never, { onConflict: 'user_id,record_date' });

      if (error) {
        console.warn('[notesApi] saveCloud error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[notesApi] saveCloud failed:', err);
      return false;
    }
  },

  async sync(userId?: string): Promise<{ notes: TraderNote[]; synced: boolean }> {
    const local = this.getLocal();

    if (!userId || userId === '00000000-0000-0000-0000-000000000000') {
      return { notes: local, synced: false };
    }

    try {
      const cloud = await this.getCloud(userId);

      if (!cloud || cloud.length === 0) {
        // Cloud is empty, push local notes to cloud
        await this.saveCloud(userId, local);
        return { notes: local, synced: true };
      }

      // Merge: Start with cloud map, overlay any local notes with newer updates or missing IDs
      const map = new Map<string, TraderNote>();
      for (const n of cloud) {
        map.set(n.id, n);
      }

      let hasLocalAdditions = false;
      for (const localNote of local) {
        const cloudNote = map.get(localNote.id);
        if (!cloudNote) {
          // New note created on this device that isn't on cloud yet!
          map.set(localNote.id, localNote);
          hasLocalAdditions = true;
        } else {
          // Compare updatedAt/date
          const localTime = new Date(localNote.updatedAt || localNote.date).getTime() || 0;
          const cloudTime = new Date(cloudNote.updatedAt || cloudNote.date).getTime() || 0;
          if (localTime > cloudTime) {
            map.set(localNote.id, localNote);
            hasLocalAdditions = true;
          }
        }
      }

      const merged = Array.from(map.values()).sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      this.saveLocal(merged);

      if (hasLocalAdditions || merged.length !== cloud.length) {
        await this.saveCloud(userId, merged);
      }

      return { notes: merged, synced: true };
    } catch (err) {
      console.warn('[notesApi] sync error:', err);
      return { notes: local, synced: false };
    }
  },
};
