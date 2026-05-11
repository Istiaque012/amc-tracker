import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { getDay } from 'date-fns';

export function useScheduleTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) { setTemplates([]); setAssignments([]); setLoading(false); return; }
    setLoading(true);
    const [{ data: tpls }, { data: asgn }] = await Promise.all([
      supabase.from('schedule_templates').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('schedule_template_assignments').select('*').eq('user_id', user.id),
    ]);
    if (tpls) setTemplates(tpls);
    if (asgn) setAssignments(asgn);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function getTodayTemplate() {
    const dow = getDay(new Date()); // 0=Sun
    const assignment = assignments.find(a => a.day_of_week === dow);
    if (!assignment?.template_id) {
      // Fallback: first default template
      return templates.find(t => t.is_default) || templates[0] || null;
    }
    return templates.find(t => t.id === assignment.template_id) || null;
  }

  function getTodayBlocks() {
    const tpl = getTodayTemplate();
    if (!tpl || !tpl.blocks) return [];
    return tpl.blocks.map(b => ({
      label: b.label,
      time: `${b.start}–${b.end}`,
      start: b.start,
      end: b.end,
      done: false,
      note: '',
    }));
  }

  async function createTemplate(data) {
    if (!user) return;
    const { error } = await supabase
      .from('schedule_templates')
      .insert({ user_id: user.id, ...data });
    if (!error) await fetchAll();
    return { error };
  }

  async function updateTemplate(id, updates) {
    if (!user) return;
    const { error } = await supabase
      .from('schedule_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('id', id);
    if (!error) await fetchAll();
    return { error };
  }

  async function deleteTemplate(id) {
    if (!user) return;
    // Clear assignments using this template
    await supabase
      .from('schedule_template_assignments')
      .update({ template_id: null })
      .eq('user_id', user.id)
      .eq('template_id', id);
    const { error } = await supabase
      .from('schedule_templates')
      .delete()
      .eq('user_id', user.id)
      .eq('id', id);
    if (!error) await fetchAll();
    return { error };
  }

  async function assignTemplate(dayOfWeek, templateId) {
    if (!user) return;
    const { error } = await supabase
      .from('schedule_template_assignments')
      .upsert(
        { user_id: user.id, day_of_week: dayOfWeek, template_id: templateId || null },
        { onConflict: 'user_id,day_of_week' }
      );
    if (!error) await fetchAll();
    return { error };
  }

  return {
    templates, assignments, loading,
    getTodayTemplate, getTodayBlocks,
    createTemplate, updateTemplate, deleteTemplate, assignTemplate,
    refetch: fetchAll,
  };
}
