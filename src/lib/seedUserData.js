import { supabase } from './supabase';
import {
  DEFAULT_SETTINGS,
  DEFAULT_PHASES,
  DEFAULT_SUBJECTS,
  DEFAULT_TASKS,
  DEFAULT_SCHEDULE_TEMPLATES,
  DEFAULT_SCHEDULE_ASSIGNMENTS,
} from './defaultSeedData';
import { format, addDays, parseISO } from 'date-fns';

// Idempotent — safe to call on every login.
export async function ensureUserSetup(userId) {
  try {
    // 1. user_settings
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingSettings) {
      await supabase.from('user_settings').insert({ user_id: userId, ...DEFAULT_SETTINGS });
    }

    // 2. phases
    const { data: existingPhases } = await supabase
      .from('phases')
      .select('id, name, sort_order')
      .eq('user_id', userId);

    let phaseMap = {}; // sort_order -> id
    if (!existingPhases || existingPhases.length === 0) {
      const { data: inserted } = await supabase
        .from('phases')
        .insert(DEFAULT_PHASES.map(p => ({ user_id: userId, ...p })))
        .select('id, sort_order');
      if (inserted) inserted.forEach(p => { phaseMap[p.sort_order] = p.id; });
    } else {
      existingPhases.forEach(p => { phaseMap[p.sort_order] = p.id; });
    }

    // 3. subjects
    const { data: existingSubjects } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('user_id', userId);

    let subjectMap = {}; // name -> id
    if (!existingSubjects || existingSubjects.length === 0) {
      const { data: inserted } = await supabase
        .from('subjects')
        .insert(DEFAULT_SUBJECTS.map(s => ({ user_id: userId, ...s })))
        .select('id, name');
      if (inserted) inserted.forEach(s => { subjectMap[s.name] = s.id; });
    } else {
      existingSubjects.forEach(s => { subjectMap[s.name] = s.id; });
    }

    // 4. tasks
    const { data: existingTasks } = await supabase
      .from('tasks')
      .select('id, sort_order')
      .eq('user_id', userId);

    let taskMap = {}; // sort_order -> id
    if (!existingTasks || existingTasks.length === 0) {
      const taskRows = DEFAULT_TASKS.map(t => ({
        user_id: userId,
        title: t.title,
        phase: t.phase,
        phase_id: phaseMap[t.phase] || null,
        subject_id: t.subject ? (subjectMap[t.subject] || null) : null,
        emedici_qty: t.emedici_qty,
        is_milestone: t.is_milestone,
        is_mock: t.is_mock,
        is_custom: false,
        sort_order: t.sort_order,
      }));
      // Insert in batches of 20 to avoid payload limits
      for (let i = 0; i < taskRows.length; i += 20) {
        const { data: inserted } = await supabase
          .from('tasks')
          .insert(taskRows.slice(i, i + 20))
          .select('id, sort_order');
        if (inserted) inserted.forEach(t => { taskMap[t.sort_order] = t.id; });
      }
    } else {
      existingTasks.forEach(t => { taskMap[t.sort_order] = t.id; });
    }

    // 5. schedule_templates
    const { data: existingTemplates } = await supabase
      .from('schedule_templates')
      .select('id, name')
      .eq('user_id', userId);

    let templateMap = {}; // name -> id
    if (!existingTemplates || existingTemplates.length === 0) {
      const { data: inserted } = await supabase
        .from('schedule_templates')
        .insert(DEFAULT_SCHEDULE_TEMPLATES.map(t => ({ user_id: userId, ...t })))
        .select('id, name');
      if (inserted) inserted.forEach(t => { templateMap[t.name] = t.id; });
    } else {
      existingTemplates.forEach(t => { templateMap[t.name] = t.id; });
    }

    // 6. schedule_template_assignments
    const { data: existingAssignments } = await supabase
      .from('schedule_template_assignments')
      .select('id')
      .eq('user_id', userId);

    if (!existingAssignments || existingAssignments.length === 0) {
      const assignments = Object.entries(DEFAULT_SCHEDULE_ASSIGNMENTS).map(([dow, tplName]) => ({
        user_id: userId,
        day_of_week: parseInt(dow),
        template_id: templateMap[tplName] || null,
      }));
      await supabase.from('schedule_template_assignments').insert(assignments);
    }

    // 7. study_log seed (2 pre-completed days)
    const { data: existingLogs } = await supabase
      .from('study_log')
      .select('date')
      .eq('user_id', userId);

    if (!existingLogs || existingLogs.length === 0) {
      await supabase.from('study_log').insert([
        {
          user_id: userId,
          date: '2026-05-05',
          status: 'complete',
          task_num: 1,
          task_id: taskMap[1] || null,
          e_medici: 0,
          blocks: [],
        },
        {
          user_id: userId,
          date: '2026-05-06',
          status: 'complete',
          task_num: 2,
          task_id: taskMap[2] || null,
          e_medici: 0,
          blocks: [],
        },
      ]);
    }

    // 8. Endocrinology SR record
    const { data: existingSR } = await supabase
      .from('sr_records')
      .select('id')
      .eq('user_id', userId)
      .eq('subject_name', 'Endocrinology')
      .maybeSingle();

    if (!existingSR) {
      await supabase.from('sr_records').insert({
        user_id: userId,
        subject_name: 'Endocrinology',
        subject_id: subjectMap['Endocrinology'] || null,
        completed_date: '2026-05-05',
        sr1_due: '2026-05-12',
        sr1_done: false,
        max_hits: 3,
      });
    }

    // 9. Backfill task_id on existing study_log rows where task_id is null
    if (Object.keys(taskMap).length > 0) {
      const { data: logsNeedingTaskId } = await supabase
        .from('study_log')
        .select('id, task_num')
        .eq('user_id', userId)
        .is('task_id', null)
        .not('task_num', 'is', null);

      if (logsNeedingTaskId && logsNeedingTaskId.length > 0) {
        for (const log of logsNeedingTaskId) {
          const tid = taskMap[log.task_num];
          if (tid) {
            await supabase
              .from('study_log')
              .update({ task_id: tid })
              .eq('id', log.id);
          }
        }
      }
    }

    // 10. Backfill subject_id on existing sr_records where subject_id is null
    if (Object.keys(subjectMap).length > 0) {
      const { data: srNeedingSubjectId } = await supabase
        .from('sr_records')
        .select('id, subject_name')
        .eq('user_id', userId)
        .is('subject_id', null);

      if (srNeedingSubjectId && srNeedingSubjectId.length > 0) {
        for (const rec of srNeedingSubjectId) {
          const sid = subjectMap[rec.subject_name];
          if (sid) {
            await supabase
              .from('sr_records')
              .update({ subject_id: sid })
              .eq('id', rec.id);
          }
        }
      }
    }

    return { success: true };
  } catch (err) {
    console.error('ensureUserSetup error:', err);
    return { success: false, error: err };
  }
}
