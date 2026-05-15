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
  log('ensureUserSetup start for user: ' + userId);

  let subjectMap = {};
  let subjectRows = [];
  let taskMap = {};
  let taskRows = [];
  let phaseMap = {};

  // Step 1: user_settings
  log('Seeding step 1: user_settings...');
  try {
    const { data: existingSettings } = await supabase
      .from('user_settings').select('id').eq('user_id', userId).maybeSingle();
    if (!existingSettings) {
      const { error } = await supabase.from('user_settings').insert({ user_id: userId, ...DEFAULT_SETTINGS });
      if (error) err('step 1 user_settings insert', error);
      else log('Step 1 DONE: user_settings inserted');
    } else {
      log('Step 1 SKIP: user_settings already exist');
    }
  } catch (e) { err('step 1 user_settings', e); }

  // Step 2: phases
  log('Seeding step 2: phases...');
  try {
    const { data: existingPhases } = await supabase
      .from('phases').select('id, name, sort_order').eq('user_id', userId);
    if (!existingPhases || existingPhases.length === 0) {
      const { data: inserted, error } = await supabase
        .from('phases')
        .insert(DEFAULT_PHASES.map(p => ({ user_id: userId, ...p })))
        .select('id, sort_order');
      if (error) err('step 2 phases insert', error);
      else if (inserted) {
        inserted.forEach(p => { phaseMap[p.sort_order] = p.id; });
        log(`Step 2 DONE: ${inserted.length} phases inserted`);
      }
    } else {
      existingPhases.forEach(p => { phaseMap[p.sort_order] = p.id; });
      log('Step 2 SKIP: phases already exist');
    }
  } catch (e) { err('step 2 phases', e); }

  // Step 3: subjects
  log('Seeding step 3: subjects...');
  try {
    const { data: existingSubjects } = await supabase
      .from('subjects').select('id, name').eq('user_id', userId);
    if (!existingSubjects || existingSubjects.length === 0) {
      const { data: inserted, error } = await supabase
        .from('subjects')
        .insert(DEFAULT_SUBJECTS.map(s => ({ user_id: userId, ...s })))
        .select('id, name');
      if (error) err('step 3 subjects insert', error);
      else if (inserted) {
        subjectRows = inserted;
        inserted.forEach(s => { subjectMap[s.name] = s.id; });
        log(`Step 3 DONE: ${inserted.length} subjects inserted`);
      }
    } else {
      subjectRows = existingSubjects;
      existingSubjects.forEach(s => { subjectMap[s.name] = s.id; });
      log('Step 3 SKIP: subjects already exist');
    }
  } catch (e) { err('step 3 subjects', e); }

  // Step 4: tasks (batched 20)
  log('Seeding step 4: tasks...');
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
        if (error) err(`step 4 tasks batch ${i}–${i + 20}`, error);
        else if (inserted) {
          taskRows.push(...inserted);
          inserted.forEach(t => { taskMap[t.sort_order] = t.id; });
        }
      }
      log(`Step 4 DONE: ${taskRows.length} tasks inserted`);
    } else {
      existingTasks.forEach(t => { taskMap[t.sort_order] = t.id; });
      log('Step 4 SKIP: tasks already exist');
    }
  } catch (e) { err('step 4 tasks', e); }

  // Step 5: backfill subjects.milestone_task_id
  log('Seeding step 5: backfill milestone_task_id...');
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
          if (error) err(`step 5 backfill milestone for ${subjectName}`, error);
        }
      }
      log('Step 5 DONE: milestone_task_id backfilled');
    }
  } catch (e) { err('step 5 backfill milestone_task_id', e); }

  // Step 6: schedule_templates + schedule_blocks (relational)
  log('Seeding step 6: schedule_templates + blocks...');
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
        if (error) { err(`step 6 schedule_templates insert "${tpl.name}"`, error); continue; }
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
        if (blockError) err(`step 6 schedule_blocks for "${tpl.name}"`, blockError);
      }
      log(`Step 6 DONE: ${Object.keys(templateMap).length} templates + blocks inserted`);
    } else {
      existingTemplates.forEach(t => { templateMap[t.name] = t.id; });
      log('Step 6 SKIP: templates already exist');
    }
  } catch (e) { err('step 6 schedule_templates', e); }

  // Step 7: schedule_template_assignments
  log('Seeding step 7: schedule_template_assignments...');
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
      if (error) err('step 7 assignments insert', error);
      else log('Step 7 DONE: assignments inserted');
    } else {
      log('Step 7 SKIP: assignments already exist');
    }
  } catch (e) { err('step 7 assignments', e); }

  // Step 8: study_log seed — 2 pre-completed days
  log('Seeding step 8: study_log seed...');
  try {
    const { data: existingLogs } = await supabase
      .from('study_log').select('date').eq('user_id', userId);
    if (!existingLogs || existingLogs.length === 0) {
      const { error } = await supabase.from('study_log').insert([
        { user_id: userId, date: '2026-05-05', status: 'complete', task_num: 1, task_id: taskMap[1] || null, e_medici: 0, blocks: [] },
        { user_id: userId, date: '2026-05-06', status: 'complete', task_num: 2, task_id: taskMap[2] || null, e_medici: 0, blocks: [] },
      ]);
      if (error) err('step 8 study_log seed', error);
      else log('Step 8 DONE: 2 study_log entries seeded');
    } else {
      log('Step 8 SKIP: study_log already has entries');
    }
  } catch (e) { err('step 8 study_log', e); }

  // Step 9: Endocrinology SR record
  log('Seeding step 9: sr_records seed...');
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
      if (error) err('step 9 sr_records seed', error);
      else log('Step 9 DONE: Endocrinology SR record seeded');
    } else {
      log('Step 9 SKIP: Endocrinology SR record exists');
    }
  } catch (e) { err('step 9 sr_records', e); }

  // Step 10: Backfill task_id on study_log rows
  log('Seeding step 10: backfill task_id on study_log...');
  try {
    if (Object.keys(taskMap).length > 0) {
      const { data: logsNeedingTaskId } = await supabase
        .from('study_log').select('id, task_num').eq('user_id', userId).is('task_id', null).not('task_num', 'is', null);
      if (logsNeedingTaskId?.length > 0) {
        for (const logRow of logsNeedingTaskId) {
          const tid = taskMap[logRow.task_num];
          if (tid) {
            const { error } = await supabase.from('study_log').update({ task_id: tid }).eq('id', logRow.id);
            if (error) err(`step 10 backfill task_id log ${logRow.id}`, error);
          }
        }
        log(`Step 10 DONE: backfilled ${logsNeedingTaskId.length} rows`);
      } else {
        log('Step 10 SKIP: no rows need task_id');
      }
    }
  } catch (e) { err('step 10 backfill task_id', e); }

  // Step 11: Backfill subject_id on sr_records
  log('Seeding step 11: backfill subject_id on sr_records...');
  try {
    if (Object.keys(subjectMap).length > 0) {
      const { data: srNeedingSubjectId } = await supabase
        .from('sr_records').select('id, subject_name').eq('user_id', userId).is('subject_id', null);
      if (srNeedingSubjectId?.length > 0) {
        for (const rec of srNeedingSubjectId) {
          const sid = subjectMap[rec.subject_name];
          if (sid) {
            const { error } = await supabase.from('sr_records').update({ subject_id: sid }).eq('id', rec.id);
            if (error) err(`step 11 backfill subject_id sr ${rec.id}`, error);
          }
        }
        log(`Step 11 DONE: backfilled ${srNeedingSubjectId.length} sr_records`);
      } else {
        log('Step 11 SKIP: no sr_records need subject_id');
      }
    }
  } catch (e) { err('step 11 backfill subject_id', e); }

  log(`Seeding complete: ${subjectRows.length} subjects, ${taskRows.length} tasks inserted`);
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
