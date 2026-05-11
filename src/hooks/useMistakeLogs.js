import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export const MISTAKE_TYPES = [
  { key: 'diagnosis_gap',       label: 'Diagnosis Gap' },
  { key: 'investigation_error', label: 'Investigation Error' },
  { key: 'management_error',    label: 'Management Error' },
  { key: 'red_flag_missed',     label: 'Red Flag Missed' },
  { key: 'guideline_confusion', label: 'Guideline Confusion' },
  { key: 'misread_question',    label: 'Misread Question' },
  { key: 'time_pressure',       label: 'Time Pressure' },
  { key: 'ethics_legal',        label: 'Ethics / Legal' },
  { key: 'other',               label: 'Other' },
];

export function useMistakeLogs() {
  const { user } = useAuth();
  const [mistakes, setMistakes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMistakes = useCallback(async () => {
    if (!user) { setMistakes([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('mistake_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setMistakes(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchMistakes(); }, [fetchMistakes]);

  async function addMistake(data) {
    if (!user) return;
    const { error } = await supabase
      .from('mistake_logs')
      .insert({ user_id: user.id, ...data });
    if (!error) await fetchMistakes();
    return { error };
  }

  async function updateMistake(id, updates) {
    if (!user) return;
    const { error } = await supabase
      .from('mistake_logs')
      .update(updates)
      .eq('user_id', user.id)
      .eq('id', id);
    if (!error) await fetchMistakes();
    return { error };
  }

  async function deleteMistake(id) {
    if (!user) return;
    const { error } = await supabase
      .from('mistake_logs')
      .delete()
      .eq('user_id', user.id)
      .eq('id', id);
    if (!error) await fetchMistakes();
    return { error };
  }

  function getByType() {
    const map = {};
    mistakes.forEach(m => {
      const key = m.mistake_type || 'other';
      map[key] = (map[key] || 0) + 1;
    });
    return MISTAKE_TYPES.map(t => ({ ...t, count: map[t.key] || 0 })).filter(t => t.count > 0);
  }

  function getBySubject(subjects) {
    return (subjects || []).map(sub => ({
      subject: sub.name,
      subject_id: sub.id,
      count: mistakes.filter(m => m.subject_id === sub.id).length,
    })).filter(s => s.count > 0).sort((a, b) => b.count - a.count);
  }

  return { mistakes, loading, addMistake, updateMistake, deleteMistake, getByType, getBySubject, refetch: fetchMistakes };
}
