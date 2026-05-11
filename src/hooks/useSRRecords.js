import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { completesSRHit } from '../lib/studyUtils';

export function useSRRecords() {
  const { user } = useAuth();
  const [srRecords, setSRRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const seededRef = useRef(false);

  const fetchSRRecords = useCallback(async () => {
    if (!user) { setSRRecords([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('sr_records')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_date', { ascending: true });
    if (!error && data) setSRRecords(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSRRecords(); }, [fetchSRRecords]);

  // Reset seed flag when user changes
  useEffect(() => { seededRef.current = false; }, [user]);

  async function createSRRecord({ subject_name, completed_date, sr1_due }) {
    if (!user) return;
    const payload = { user_id: user.id, subject_name, completed_date, sr1_due };
    const { error } = await supabase
      .from('sr_records')
      .upsert(payload, { onConflict: 'user_id,subject_name' });
    if (!error) await fetchSRRecords();
    return { error };
  }

  async function completeSRHit(subjectName, hit, rating) {
    if (!user) return;
    const record = srRecords.find(r => r.subject_name === subjectName);
    if (!record) return;
    const updates = completesSRHit(record, hit, rating);
    const { error } = await supabase
      .from('sr_records')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('subject_name', subjectName);
    if (!error) await fetchSRRecords();
    return { error };
  }

  async function deleteSRRecord(subjectName) {
    if (!user) return;
    const { error } = await supabase
      .from('sr_records')
      .delete()
      .eq('user_id', user.id)
      .eq('subject_name', subjectName);
    if (!error) await fetchSRRecords();
    return { error };
  }

  async function seedInitialSRData() {
    if (!user || seededRef.current) return;
    seededRef.current = true;
    const { data: existing } = await supabase
      .from('sr_records')
      .select('subject_name')
      .eq('user_id', user.id);
    if (existing && existing.length > 0) return;
    await createSRRecord({
      subject_name: 'Endocrinology',
      completed_date: '2026-05-05',
      sr1_due: '2026-05-12',
    });
  }

  return { srRecords, loading, createSRRecord, completeSRHit, deleteSRRecord, seedInitialSRData, refetch: fetchSRRecords };
}
