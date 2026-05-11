import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function usePhases() {
  const { user } = useAuth();
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPhases = useCallback(async () => {
    if (!user) { setPhases([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('phases')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });
    if (!error && data) setPhases(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPhases(); }, [fetchPhases]);

  async function addPhase(phaseData) {
    if (!user) return;
    const maxOrder = phases.reduce((m, p) => Math.max(m, p.sort_order), 0);
    const { error } = await supabase
      .from('phases')
      .insert({ user_id: user.id, ...phaseData, sort_order: maxOrder + 1 });
    if (!error) await fetchPhases();
    return { error };
  }

  async function updatePhase(id, updates) {
    if (!user) return;
    const { error } = await supabase
      .from('phases')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('id', id);
    if (!error) await fetchPhases();
    return { error };
  }

  async function deletePhase(id) {
    if (!user) return;
    const { error } = await supabase.from('phases').delete().eq('user_id', user.id).eq('id', id);
    if (!error) await fetchPhases();
    return { error };
  }

  async function reorderPhase(id, direction) {
    const idx = phases.findIndex(p => p.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= phases.length) return;
    const a = phases[idx], b = phases[swapIdx];
    await supabase.from('phases').update({ sort_order: b.sort_order }).eq('id', a.id);
    await supabase.from('phases').update({ sort_order: a.sort_order }).eq('id', b.id);
    await fetchPhases();
  }

  return { phases, loading, addPhase, updatePhase, deletePhase, reorderPhase, refetch: fetchPhases };
}
