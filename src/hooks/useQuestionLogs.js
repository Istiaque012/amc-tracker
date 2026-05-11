import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { format } from 'date-fns';

export function useQuestionLogs() {
  const { user } = useAuth();
  const [questionLogs, setQuestionLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!user) { setQuestionLogs([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('question_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });
    if (!error && data) setQuestionLogs(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  async function addQuestionLog(logData) {
    if (!user) return;
    const { error } = await supabase
      .from('question_logs')
      .insert({ user_id: user.id, ...logData });
    if (!error) await fetchLogs();
    return { error };
  }

  async function updateQuestionLog(id, updates) {
    if (!user) return;
    const { error } = await supabase
      .from('question_logs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('id', id);
    if (!error) await fetchLogs();
    return { error };
  }

  async function deleteQuestionLog(id) {
    if (!user) return;
    const { error } = await supabase
      .from('question_logs')
      .delete()
      .eq('user_id', user.id)
      .eq('id', id);
    if (!error) await fetchLogs();
    return { error };
  }

  // Derived stats
  const totalQuestions = questionLogs.reduce((s, q) => s + (q.questions_done || 0), 0);
  const totalCorrect = questionLogs.reduce((s, q) => s + (q.correct_count || 0), 0);
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayTotal = questionLogs
    .filter(q => q.date === todayStr)
    .reduce((s, q) => s + (q.questions_done || 0), 0);

  function getAccuracyBySubject(subjects) {
    return (subjects || []).map(sub => {
      const subLogs = questionLogs.filter(q => q.subject_id === sub.id);
      const done = subLogs.reduce((s, q) => s + (q.questions_done || 0), 0);
      const correct = subLogs.reduce((s, q) => s + (q.correct_count || 0), 0);
      return {
        subject: sub.name,
        subject_id: sub.id,
        questions: done,
        correct,
        accuracy: done > 0 ? Math.round((correct / done) * 100) : null,
      };
    }).filter(s => s.questions > 0).sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100));
  }

  return {
    questionLogs, loading,
    totalQuestions, totalCorrect, overallAccuracy, todayTotal,
    addQuestionLog, updateQuestionLog, deleteQuestionLog,
    getAccuracyBySubject,
    refetch: fetchLogs,
  };
}
