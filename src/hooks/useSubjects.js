import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useSubjects() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSubjects = useCallback(async () => {
    if (!user) { setSubjects([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });
    if (!error && data) setSubjects(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  async function addSubject(subjectData) {
    if (!user) return;
    const maxOrder = subjects.reduce((m, s) => Math.max(m, s.sort_order), 0);
    const { data: subjectRow, error } = await supabase
      .from('subjects')
      .insert({ user_id: user.id, ...subjectData, sort_order: maxOrder + 1 })
      .select()
      .single();
    if (error) return { error };

    // Auto-generate tasks for this subject
    const classCount = subjectData.class_count || 1;
    const taskRows = [];
    const { data: maxTask } = await supabase
      .from('tasks')
      .select('sort_order')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    let nextOrder = (maxTask?.sort_order || 0) + 1;

    for (let i = 1; i <= classCount; i++) {
      const title = classCount === 1
        ? `${subjectData.name} — Watch · Notes`
        : `${subjectData.name} ${i} — Watch · Notes`;
      taskRows.push({
        user_id: user.id,
        subject_id: subjectRow.id,
        title,
        phase: subjectData.phase || 1,
        emedici_qty: 10,
        is_milestone: false,
        is_custom: true,
        sort_order: nextOrder++,
      });
    }
    // Milestone/consolidation task
    taskRows.push({
      user_id: user.id,
      subject_id: subjectRow.id,
      title: `${subjectData.name} — Consolidation · Pass 2 · Master Sheet`,
      phase: subjectData.phase || 1,
      emedici_qty: subjectData.emedici_target || 40,
      is_milestone: true,
      is_custom: true,
      sort_order: nextOrder,
    });

    await supabase.from('tasks').insert(taskRows);
    await fetchSubjects();
    return { error: null };
  }

  async function updateSubject(id, updates) {
    if (!user) return;
    const { error } = await supabase
      .from('subjects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('id', id);
    if (!error) await fetchSubjects();
    return { error };
  }

  async function deleteSubject(id) {
    if (!user) return;
    // Delete SR records, tasks for this subject
    await supabase.from('sr_records').delete().eq('user_id', user.id).eq('subject_id', id);
    await supabase.from('tasks').delete().eq('user_id', user.id).eq('subject_id', id);
    const { error } = await supabase.from('subjects').delete().eq('user_id', user.id).eq('id', id);
    if (!error) await fetchSubjects();
    return { error };
  }

  async function reorderSubject(id, direction) {
    const idx = subjects.findIndex(s => s.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= subjects.length) return;
    const a = subjects[idx], b = subjects[swapIdx];
    await supabase.from('subjects').update({ sort_order: b.sort_order }).eq('id', a.id);
    await supabase.from('subjects').update({ sort_order: a.sort_order }).eq('id', b.id);
    await fetchSubjects();
  }

  return { subjects, loading, addSubject, updateSubject, deleteSubject, reorderSubject, refetch: fetchSubjects };
}
