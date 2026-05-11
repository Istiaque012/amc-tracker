import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useMockExams() {
  const { user } = useAuth();
  const [mockExams, setMockExams] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMocks = useCallback(async () => {
    if (!user) { setMockExams([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('mock_exams')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    if (!error && data) setMockExams(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchMocks(); }, [fetchMocks]);

  async function addMockExam(data) {
    if (!user) return;
    const total = data.total_questions || 150;
    const correct = data.correct_count || 0;
    const percentage = total > 0 ? Math.round((correct / total) * 100 * 10) / 10 : null;
    const { error } = await supabase
      .from('mock_exams')
      .insert({ user_id: user.id, ...data, percentage });
    if (!error) await fetchMocks();
    return { error };
  }

  async function updateMockExam(id, updates) {
    if (!user) return;
    const total = updates.total_questions;
    const correct = updates.correct_count;
    const percentage = total && correct != null ? Math.round((correct / total) * 100 * 10) / 10 : undefined;
    const { error } = await supabase
      .from('mock_exams')
      .update({ ...updates, ...(percentage != null ? { percentage } : {}), updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('id', id);
    if (!error) await fetchMocks();
    return { error };
  }

  async function deleteMockExam(id) {
    if (!user) return;
    await supabase.from('mock_exam_breakdown').delete().eq('mock_exam_id', id);
    const { error } = await supabase.from('mock_exams').delete().eq('user_id', user.id).eq('id', id);
    if (!error) await fetchMocks();
    return { error };
  }

  const latestMock = mockExams[0] || null;
  const avgPercentage = mockExams.length > 0
    ? Math.round(mockExams.reduce((s, m) => s + (m.percentage || 0), 0) / mockExams.length * 10) / 10
    : null;

  return { mockExams, loading, latestMock, avgPercentage, addMockExam, updateMockExam, deleteMockExam, refetch: fetchMocks };
}
