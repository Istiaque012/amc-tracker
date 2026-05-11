import { differenceInDays, addDays, parseISO, format } from 'date-fns';
import { TASKS, SUBJECTS, SR_INTERVALS } from './constants';

export function getNextTaskNum(logs) {
  if (!logs || logs.length === 0) return 1;
  const maxDone = Math.max(0, ...logs.filter(l => l.status === 'complete').map(l => l.task_num));
  return Math.min(maxDone + 1, 77);
}

export function getDeficit(logs) {
  let target = 0, done = 0;
  logs.filter(l => l.status === 'complete').forEach(l => {
    const task = TASKS.find(t => t.id === l.task_num);
    if (task) target += task.eQty;
    done += l.e_medici || 0;
  });
  return Math.max(0, target - done);
}

export function getTotalEMedici(logs) {
  return logs.reduce((sum, l) => sum + (l.e_medici || 0), 0);
}

export function getStreak(logs) {
  const completeDates = logs
    .filter(l => l.status === 'complete')
    .map(l => l.date)
    .sort()
    .reverse();
  if (completeDates.length === 0) return 0;
  let streak = 0, prev = null;
  for (const d of completeDates) {
    if (!prev) { streak = 1; prev = d; }
    else if (differenceInDays(parseISO(prev), parseISO(d)) === 1) { streak++; prev = d; }
    else break;
  }
  return streak;
}

export function calcRetention(lastReviewDate, stability = 1) {
  if (!lastReviewDate) return 0;
  const daysSince = differenceInDays(new Date(), parseISO(lastReviewDate));
  if (daysSince < 0) return 100;
  return Math.max(0, Math.min(100, Math.round(100 * Math.exp(-daysSince / (stability * 14)))));
}

export function getStability(srRecord) {
  if (!srRecord) return 1;
  if (srRecord.sr3_done) return 6;
  if (srRecord.sr2_done) return 3.5;
  if (srRecord.sr1_done) return 2;
  return 1;
}

export function getSRDue(srRecords) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  return srRecords.flatMap(rec => {
    const hits = [];
    if (rec.sr1_due && !rec.sr1_done && rec.sr1_due <= todayStr)
      hits.push({ ...rec, hit: 'sr1', label: 'SR1', overdue: rec.sr1_due < todayStr });
    else if (rec.sr2_due && !rec.sr2_done && rec.sr2_due <= todayStr)
      hits.push({ ...rec, hit: 'sr2', label: 'SR2', overdue: rec.sr2_due < todayStr });
    else if (rec.sr3_due && !rec.sr3_done && rec.sr3_due <= todayStr)
      hits.push({ ...rec, hit: 'sr3', label: 'SR3', overdue: rec.sr3_due < todayStr });
    return hits;
  });
}

export function getReadiness(logs, srRecords) {
  const done = logs.filter(l => l.status === 'complete').length;
  const taskScore = (done / 77) * 40;

  let srTotal = 0, srDone = 0;
  srRecords.forEach(r => {
    if (r.sr1_due) { srTotal++; if (r.sr1_done) srDone++; }
    if (r.sr2_due) { srTotal++; if (r.sr2_done) srDone++; }
    if (r.sr3_due) { srTotal++; if (r.sr3_done) srDone++; }
  });
  const srScore = srTotal > 0 ? (srDone / srTotal) * 30 : 0;

  const deficit = getDeficit(logs);
  const eScore = Math.max(0, 30 - deficit / 8);

  return Math.min(99, Math.round(taskScore + srScore + eScore));
}

export function getProjectedDates(logs) {
  const today = new Date();
  const completedTaskIds = new Set(
    logs.filter(l => l.status === 'complete').map(l => l.task_num)
  );
  const pendingTasks = TASKS.filter(t => !completedTaskIds.has(t.id));

  const projected = {};
  pendingTasks.forEach((task, index) => {
    projected[task.id] = format(addDays(today, index + 1), 'yyyy-MM-dd');
  });
  return projected;
}

export function completesSRHit(srRecord, hit, rating) {
  const interval = SR_INTERVALS[rating] || 14;
  const today = format(new Date(), 'yyyy-MM-dd');
  const updates = {};

  if (hit === 'sr1') {
    updates.sr1_done = true;
    updates.sr1_rating = rating;
    updates.sr1_done_date = today;
    updates.sr2_due = format(addDays(new Date(), Math.round(interval * 1.5)), 'yyyy-MM-dd');
  } else if (hit === 'sr2') {
    updates.sr2_done = true;
    updates.sr2_rating = rating;
    updates.sr2_done_date = today;
    updates.sr3_due = format(addDays(new Date(), interval * 2), 'yyyy-MM-dd');
  } else if (hit === 'sr3') {
    updates.sr3_done = true;
    updates.sr3_rating = rating;
    updates.sr3_done_date = today;
  }
  return updates;
}

export function getCompletedSubjects(logs, srRecords) {
  const completedTaskIds = new Set(
    logs.filter(l => l.status === 'complete').map(l => l.task_num)
  );
  return SUBJECTS.filter(s => completedTaskIds.has(s.milestoneTaskId));
}

export function getPhaseProgress(logs) {
  const completedIds = new Set(logs.filter(l => l.status === 'complete').map(l => l.task_num));
  const p1Tasks = TASKS.filter(t => t.phase === 1);
  const p2Tasks = TASKS.filter(t => t.phase === 2);
  const p3Tasks = TASKS.filter(t => t.phase === 3);
  return {
    phase1: { done: p1Tasks.filter(t => completedIds.has(t.id)).length, total: p1Tasks.length },
    phase2: { done: p2Tasks.filter(t => completedIds.has(t.id)).length, total: p2Tasks.length },
    phase3: { done: p3Tasks.filter(t => completedIds.has(t.id)).length, total: p3Tasks.length },
  };
}
