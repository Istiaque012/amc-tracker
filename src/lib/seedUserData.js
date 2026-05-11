import { supabase } from './supabase';
import {
  DEFAULT_SETTINGS,
  DEFAULT_PHASES,
  DEFAULT_SUBJECTS,
  DEFAULT_TASKS,
  DEFAULT_SCHEDULE_TEMPLATES,
  DEFAULT_SCHEDULE_ASSIGNMENTS,
} from './defaultSeedData';

function log(msg) { console.log(`[seed] ${msg}`); }
function err(step, error) { console.error(`[seed] FAILED at "${step}":`, error?.message || error); }

export async function ensureUserSetup(userId) {
  log('ensureUserSetup start');

  // 1. user_settings
  let subjectMap = {};
  let subjectRows = [];
  let taskMap = {};
  let taskRows = [];
  let phaseMap = {};

  try {
    const { data: existingSettings } = await supabase
      .from('user_settings').select('id').eq('user_id', userId).maybeSingle();
    if (!existingSettings) {
      const { error } = await supabase.from('user_settings').insert({ user_id: userId, ...DEFAULT_SETTINGS });
      if (error) err('user_settings insert', error);
      else log('user_settings inserted');
    }
  } catch (e) { err('user_settings', e); }

  // 2. phases
  try {
    const { data: existingPhases } = await supabase
      .from('phases').select('id, name, sort_order').eq('user_id', userId);
    if (!existingPhases || existingPhases.length === 0) {
      const { data: inserted, error } = await supabase
        .from('phases')
        .insert(DEFAULT_PHASES.map(p => ({ user_id: userId, ...p })))
        .select('id, sort_order');
      if (error) err('phases insert', error);
      else if (inserted) {
        inserted.forEach(p => { phaseMap[p.sort_order] = p.id; });
        log(`phases inserted: ${inserted.length}`);
      }
    } else {
      existingPhases.forEach(p => { phaseMap[p.sort_order] = p.id; });
    }
  } catch (e) { err('phases', e); }

  // 3. subjects
  try {
    const { data: existingSubjects } = await supabase
      .from('subjects').select('id, name').eq('user_id', userId);
    if (!existingSubjects || existingSubjects.length === 0) {
      const { data: inserted, error } = await supabase
        .from('subjects')
        .insert(DEFAULT_SUBJECTS.map(s => ({ user_id: userId, ...s })))
        .select('id, name');
      if (error) err('subjects insert', error);
      else if (inserted) {
        subjectRows = inserted;
        inserted.forEach(s => { subjectMap[s.name] = s.id; });
        log(`subjects inserted: ${inserted.length}`);
      }
    } else {
      subjectRows = existingSubjects;
      existingSubjects.forEach(s => { subjectMap[s.name] = s.id; });
    }
  } catch (e) { err('subjects', e); }

  // 4. tasks (batched 20)
  try {
    const { data: existingTasks } = await supabase
      .from('tasks').select('id, sort_order').eq('user_id', userId);
    if (!existingTasks || existingTasks.length === 0) {
      const taskInserts = DEFAULT_TASKS.map(t => ({
        user_id: userId,
        title: t.title,
        phase: t.phase,
        phase_id: phaseMap[t.phase] || null,
        subject_id: t.subject ? (subjectMap[t.subject] || null) : null,
        subject: t.subject || null,
        emedici_qty: t.emedici_qty,
        is_milestone: t.is_milestone,
        is_mock: t.is_mock,
        is_custom: false,
        sort_order: t.sort_order,
      }));
      for (let i = 0; i < taskInserts.length; i += 20) {
        const { data: inserted, error } = await supabase
          .from('tasks').insert(taskInserts.slice(i, i + 20)).select('id, sort_order');
        if (error) err(`tasks batch ${i}–${i + 20}`, error);
        else if (inserted) {
          taskRows.push(...inserted);
          inserted.forEach(t => { taskMap[t.sort_order] = t.id; });
        }
      }
      log(`tasks inserted: ${taskRows.length}`);
    } else {
      existingTasks.forEach(t => { taskMap[t.sort_order] = t.id; });
    }
  } catch (e) { err('tasks', e); }

  // 4b. Backfill subjects.milestone_task_id
  try {
    if (Object.keys(taskMap).length > 0 && Object.keys(subjectMap).length > 0) {
      const milestoneBySubject = {};
      DEFAULT_TASKS.filter(t => t.is_milestone && t.subject).forEach(t => {
        milestoneBySubject[t.subject] = t.sort_order;
      });
      for (const [subjectName, sortOrder] of Object.entries(milestoneBySubject)) {
        const subjectId = subjectMap[subjectName];
        const taskId = taskMap[sortOrder];
        if (subjectId && taskId) {
          const { error } = await supabase.from('subjects')
            .update({ milestone_task_id: taskId })
            .eq('id', subjectId)
            .eq('user_id', userId);
          if (error) err(`backfill milestone_task_id for ${subjectName}`, error);
        }
      }
      log('backfill milestone_task_id done');
    }
  } catch (e) { err('backfill milestone_task_id', e); }

  // 5. schedule_templates + schedule_blocks (relational)
  let templateMap = {};
  try {
    const { data: existingTemplates } = await supabase
      .from('schedule_templates').select('id, name').eq('user_id', userId);
    if (!existingTemplates || existingTemplates.length === 0) {
      for (const tpl of DEFAULT_SCHEDULE_TEMPLATES) {
        const { data: inserted, error } = await supabase
          .from('schedule_templates')
          .insert({ user_id: userId, name: tpl.name, is_default: tpl.is_default })
          .select('id, name')
          .single();
        if (error) { err(`schedule_templates insert "${tpl.name}"`, error); continue; }
        templateMap[tpl.name] = inserted.id;
        const blockRows = tpl.blocks.map((b, idx) => ({
          template_id: inserted.id,
          user_id: userId,
          label: b.label,
          start_time: b.start,
          end_time: b.end,
          sort_order: idx,
        }));
        const { error: blockError } = await supabase.from('schedule_blocks').insert(blockRows);
        if (blockError) err(`schedule_blocks insert for "${tpl.name}"`, blockError);
      }
      log(`schedule_templates inserted: ${Object.keys(templateMap).length}`);
    } else {
      existingTemplates.forEach(t => { templateMap[t.name] = t.id; });
    }
  } catch (e) { err('schedule_templates', e); }

  // 6. schedule_template_assignments
  try {
    const { data: existingAssignments } = await supabase
      .from('schedule_template_assignments').select('id').eq('user_id', userId);
    if (!existingAssignments || existingAssignments.length === 0) {
      const assignments = Object.entries(DEFAULT_SCHEDULE_ASSIGNMENTS).map(([dow, tplName]) => ({
        user_id: userId,
        day_of_week: parseInt(dow),
        template_id: templateMap[tplName] || null,
      }));
      const { error } = await supabase.from('schedule_template_assignments').insert(assignments);
      if (error) err('schedule_template_assignments insert', error);
      else log('schedule_template_assignments inserted');
    }
  } catch (e) { err('schedule_template_assignments', e); }

  // 7. study_log seed — 2 pre-completed days
  try {
    const { data: existingLogs } = await supabase
      .from('study_log').select('date').eq('user_id', userId);
    if (!existingLogs || existingLogs.length === 0) {
      const { error } = await supabase.from('study_log').insert([
        { user_id: userId, date: '2026-05-05', status: 'complete', task_num: 1, task_id: taskMap[1] || null, e_medici: 0, blocks: [] },
        { user_id: userId, date: '2026-05-06', status: 'complete', task_num: 2, task_id: taskMap[2] || null, e_medici: 0, blocks: [] },
      ]);
      if (error) err('study_log seed', error);
      else log('study_log seeded');
    }
  } catch (e) { err('study_log', e); }

  // 8. Endocrinology SR record
  try {
    const { data: existingSR } = await supabase
      .from('sr_records').select('id').eq('user_id', userId).eq('subject_name', 'Endocrinology').maybeSingle();
    if (!existingSR) {
      const { error } = await supabase.from('sr_records').insert({
        user_id: userId,
        subject_name: 'Endocrinology',
        subject_id: subjectMap['Endocrinology'] || null,
        completed_date: '2026-05-05',
        sr1_due: '2026-05-12',
        sr1_done: false,
        max_hits: 3,
      });
      if (error) err('sr_records seed', error);
      else log('sr_records Endocrinology seeded');
    }
  } catch (e) { err('sr_records', e); }

  // 9. Backfill task_id on existing study_log rows
  try {
    if (Object.keys(taskMap).length > 0) {
      const { data: logsNeedingTaskId } = await supabase
        .from('study_log').select('id, task_num').eq('user_id', userId).is('task_id', null).not('task_num', 'is', null);
      if (logsNeedingTaskId?.length > 0) {
        for (const logRow of logsNeedingTaskId) {
          const tid = taskMap[logRow.task_num];
          if (tid) {
            const { error } = await supabase.from('study_log').update({ task_id: tid }).eq('id', logRow.id);
            if (error) err(`backfill task_id log ${logRow.id}`, error);
          }
        }
      }
    }
  } catch (e) { err('backfill task_id', e); }

  // 10. Backfill subject_id on existing sr_records
  try {
    if (Object.keys(subjectMap).length > 0) {
      const { data: srNeedingSubjectId } = await supabase
        .from('sr_records').select('id, subject_name').eq('user_id', userId).is('subject_id', null);
      if (srNeedingSubjectId?.length > 0) {
        for (const rec of srNeedingSubjectId) {
          const sid = subjectMap[rec.subject_name];
          if (sid) {
            const { error } = await supabase.from('sr_records').update({ subject_id: sid }).eq('id', rec.id);
            if (error) err(`backfill subject_id sr ${rec.id}`, error);
          }
        }
      }
    }
  } catch (e) { err('backfill subject_id', e); }

  log(`seeding complete — ${subjectRows.length} subjects, ${taskRows.length} tasks`);
  return { success: true };
}

export async function forceReseed(userId) {
  log('forceReseed start — clearing all data');
  const tables = [
    'schedule_template_assignments',
    'schedule_blocks',
    'schedule_templates',
    'mistake_logs',
    'question_logs',
    'mock_exam_breakdown',
    'mock_exams',
    'sr_records',
    'study_log',
    'tasks',
    'subjects',
    'phases',
    'user_settings',
  ];
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    if (error) err(`forceReseed delete ${table}`, error);
  }
  log('forceReseed clear done — reseeding');
  return ensureUserSetup(userId);
}
