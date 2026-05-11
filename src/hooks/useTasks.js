import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) { setTasks([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });
    if (!error && data) setTasks(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  async function addTask(taskData) {
    if (!user) return;
    const maxOrder = tasks.reduce((m, t) => Math.max(m, t.sort_order), 0);
    const { error } = await supabase
      .from('tasks')
      .insert({ user_id: user.id, ...taskData, is_custom: true, sort_order: maxOrder + 1 });
    if (!error) await fetchTasks();
    return { error };
  }

  async function updateTask(id, updates) {
    if (!user) return;
    const { error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('id', id);
    if (!error) await fetchTasks();
    return { error };
  }

  async function deleteTask(id) {
    if (!user) return;
    const { error } = await supabase.from('tasks').delete().eq('user_id', user.id).eq('id', id);
    if (!error) await fetchTasks();
    return { error };
  }

  async function reorderTask(id, direction) {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= tasks.length) return;
    const a = tasks[idx], b = tasks[swapIdx];
    await supabase.from('tasks').update({ sort_order: b.sort_order }).eq('id', a.id);
    await supabase.from('tasks').update({ sort_order: a.sort_order }).eq('id', b.id);
    await fetchTasks();
  }

  function getTasksBySubject(subjectId) {
    return tasks.filter(t => t.subject_id === subjectId).sort((a, b) => a.sort_order - b.sort_order);
  }

  function getTasksByPhase(phase) {
    return tasks.filter(t => t.phase === phase).sort((a, b) => a.sort_order - b.sort_order);
  }

  return { tasks, loading, addTask, updateTask, deleteTask, reorderTask, getTasksBySubject, getTasksByPhase, refetch: fetchTasks };
}
