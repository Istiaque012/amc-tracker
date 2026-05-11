import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useStudyLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const seededRef = useRef(false);

  const fetchLogs = useCallback(async () => {
    if (!user) { setLogs([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('study_log')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });
    if (!error && data) setLogs(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Reset seed flag when user changes
  useEffect(() => { seededRef.current = false; }, [user]);

  async function upsertLog({ date, status, task_num, e_medici, blocks, partial_pct, note }) {
    if (!user) return;
    const payload = {
      user_id: user.id,
      date,
      status,
      task_num,
      e_medici: e_medici || 0,
      blocks: blocks || [],
      partial_pct: partial_pct || 0,
      note: note || null,
    };
    const { error } = await supabase
      .from('study_log')
      .upsert(payload, { onConflict: 'user_id,date' });
    if (!error) await fetchLogs();
    return { error };
  }

  async function deleteLog(date) {
    if (!user) return;
    const { error } = await supabase
      .from('study_log')
      .delete()
      .eq('user_id', user.id)
      .eq('date', date);
    if (!error) await fetchLogs();
    return { error };
  }

  async function updateBlocks(date, blocks) {
    if (!user) return;
    const existing = logs.find(l => l.date === date);
    if (!existing) {
      await upsertLog({ date, status: 'pending', task_num: null, blocks });
      return;
    }
    const { error } = await supabase
      .from('study_log')
      .update({ blocks, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('date', date);
    if (!error) await fetchLogs();
    return { error };
  }

  async function seedInitialData() {
    if (!user || seededRef.current) return;
    seededRef.current = true;
    const { data: existing } = await supabase
      .from('study_log')
      .select('date')
      .eq('user_id', user.id);
    if (existing && existing.length > 0) return;
    const seedLogs = [
      { user_id: user.id, date: '2026-05-05', status: 'complete', task_num: 1, e_medici: 0, blocks: [] },
      { user_id: user.id, date: '2026-05-06', status: 'complete', task_num: 2, e_medici: 0, blocks: [] },
    ];
    await supabase.from('study_log').insert(seedLogs);
    await fetchLogs();
  }

  return { logs, loading, upsertLog, deleteLog, updateBlocks, seedInitialData, refetch: fetchLogs };
}
