import { differenceInDays, addDays, parseISO, format } from 'date-fns';

const RATING_INTERVALS = { blackout: 3, hard: 7, medium: 14, easy: 21 };

// ── Task helpers ─────────────────────────────────────────────────────────────

export function getNextTask(logs, tasks) {
  if (!tasks || tasks.length === 0) return null;
  const completedIds = new Set(
    logs.filter(l => l.status === 'complete').map(l => l.task_id || String(l.task_num))
  );
  const sorted = [...tasks].sort((a, b) => a.sort_order - b.sort_order);
  return sorted.find(t => !completedIds.has(t.id) && !completedIds.has(String(t.sort_order))) || null;
}

export function getNextTaskNum(logs, tasks) {
  if (tasks && tasks.length > 0) {
    const next = getNextTask(logs, tasks);
    return next ? next.sort_order : tasks.length + 1;
  }
  // Legacy fallback
  if (!logs || logs.length === 0) return 1;
  const maxDone = Math.max(0, ...logs.filter(l => l.status === 'complete').map(l => l.task_num || 0));
  return Math.min(maxDone + 1, 77);
}

export function getDeficit(logs, tasks) {
  let target = 0, done = 0;
  logs.filter(l => l.status === 'complete').forEach(l => {
    if (tasks && tasks.length > 0) {
      const t = tasks.find(t => t.id === l.task_id || t.sort_order === l.task_num);
      if (t) target += t.emedici_qty || t.eQty || 0;
    }
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

export function getPhaseProgress(logs, tasks) {
  if (!tasks || tasks.length === 0) {
    // Legacy fallback using task_num ranges
    const completedNums = new Set(logs.filter(l => l.status === 'complete').map(l => l.task_num));
    return {
      phase1: { done: [...completedNums].filter(n => n >= 1 && n <= 44).length, total: 44 },
      phase2: { done: [...completedNums].filter(n => n >= 45 && n <= 67).length, total: 23 },
      phase3: { done: [...completedNums].filter(n => n >= 68 && n <= 77).length, total: 10 },
    };
  }
  const completedIds = new Set(logs.filter(l => l.status === 'complete').map(l => l.task_id || String(l.task_num)));
  const p1 = tasks.filter(t => t.phase === 1);
  const p2 = tasks.filter(t => t.phase === 2);
  const p3 = tasks.filter(t => t.phase === 3);
  return {
    phase1: { done: p1.filter(t => completedIds.has(t.id) || completedIds.has(String(t.sort_order))).length, total: p1.length },
    phase2: { done: p2.filter(t => completedIds.has(t.id) || completedIds.has(String(t.sort_order))).length, total: p2.length },
    phase3: { done: p3.filter(t => completedIds.has(t.id) || completedIds.has(String(t.sort_order))).length, total: p3.length },
  };
}

export function getProjectedDates(logs, tasks, userSettings) {
  const restDays = userSettings?.rest_days_per_month || 6;
  const effectiveDaysPerMonth = Math.max(1, 30 - restDays);
  const today = new Date();
  const completedIds = new Set(
    logs.filter(l => l.status === 'complete').map(l => l.task_id || String(l.task_num))
  );
  const sorted = tasks
    ? [...tasks].sort((a, b) => a.sort_order - b.sort_order).filter(t => !completedIds.has(t.id) && !completedIds.has(String(t.sort_order)))
    : [];
  const projected = {};
  sorted.forEach((task, index) => {
    const rawDay = index;
    const extraRestDays = Math.floor(rawDay / effectiveDaysPerMonth);
    projected[task.id] = format(addDays(today, rawDay + extraRestDays), 'yyyy-MM-dd');
  });
  return projected;
}

// ── SR helpers ────────────────────────────────────────────────────────────────

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

export function getSRDue(srRecords, userSettings) {
  const graceDays = userSettings?.grace_period_days ?? 2;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const graceCutoff = format(addDays(new Date(), graceDays), 'yyyy-MM-dd');

  return srRecords.flatMap(rec => {
    const maxHits = rec.max_hits || 3;
    const hits = [];
    // SR1
    if (rec.sr1_due && !rec.sr1_done && rec.sr1_due <= todayStr)
      hits.push({ ...rec, hit: 'sr1', label: 'SR1', overdue: rec.sr1_due < todayStr });
    // SR2
    else if (maxHits >= 2 && rec.sr2_due && !rec.sr2_done && rec.sr2_due <= todayStr)
      hits.push({ ...rec, hit: 'sr2', label: 'SR2', overdue: rec.sr2_due < todayStr });
    // SR3
    else if (maxHits >= 3 && rec.sr3_due && !rec.sr3_done && rec.sr3_due <= todayStr)
      hits.push({ ...rec, hit: 'sr3', label: 'SR3', overdue: rec.sr3_due < todayStr });
    return hits;
  });
}

export function completesSRHit(srRecord, hit, rating, userSettings) {
  const interval = RATING_INTERVALS[rating] || 14;
  const sr2Mult = userSettings?.sr2_multiplier ?? 1.5;
  const sr3Mult = userSettings?.sr3_multiplier ?? 2.0;
  const maxHits = srRecord?.max_hits || 3;
  const today = format(new Date(), 'yyyy-MM-dd');
  const updates = {};

  if (hit === 'sr1') {
    updates.sr1_done = true;
    updates.sr1_rating = rating;
    updates.sr1_done_date = today;
    if (maxHits >= 2) {
      updates.sr2_due = format(addDays(new Date(), Math.round(interval * sr2Mult)), 'yyyy-MM-dd');
    }
  } else if (hit === 'sr2') {
    updates.sr2_done = true;
    updates.sr2_rating = rating;
    updates.sr2_done_date = today;
    if (maxHits >= 3) {
      updates.sr3_due = format(addDays(new Date(), Math.round(interval * sr3Mult)), 'yyyy-MM-dd');
    }
  } else if (hit === 'sr3') {
    updates.sr3_done = true;
    updates.sr3_rating = rating;
    updates.sr3_done_date = today;
  }
  return updates;
}

// ── Readiness score ───────────────────────────────────────────────────────────

export function getReadiness(logs, srRecords, tasks, questionLogs, mockExams) {
  const totalTasks = tasks?.length || 77;
  const doneLogs = logs.filter(l => l.status === 'complete');
  const taskPct = totalTasks > 0 ? doneLogs.length / totalTasks : 0;
  const taskScore = Math.round(taskPct * 35);

  let srTotal = 0, srDone = 0;
  srRecords.forEach(r => {
    const max = r.max_hits || 3;
    if (r.sr1_due) { srTotal++; if (r.sr1_done) srDone++; }
    if (max >= 2 && r.sr2_due) { srTotal++; if (r.sr2_done) srDone++; }
    if (max >= 3 && r.sr3_due) { srTotal++; if (r.sr3_done) srDone++; }
  });
  const srScore = srTotal > 0 ? Math.round((srDone / srTotal) * 25) : 0;

  const totalQ = (questionLogs || []).reduce((s, q) => s + (q.questions_done || 0), 0);
  const totalCorrect = (questionLogs || []).reduce((s, q) => s + (q.correct_count || 0), 0);
  const qAccuracy = totalQ > 0 ? totalCorrect / totalQ : 0;
  const questionScore = Math.round(qAccuracy * 25);

  const latestMock = mockExams && mockExams.length > 0
    ? mockExams.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]
    : null;
  const mockPct = latestMock?.percentage ? latestMock.percentage / 100 : 0;
  const mockScore = Math.round(mockPct * 15);

  const score = Math.min(99, taskScore + srScore + questionScore + mockScore);

  let explanation = '';
  if (srScore < 10 && srTotal > 0) explanation += 'SR compliance is low. ';
  if (questionScore < 10 && totalQ > 50) explanation += 'Question accuracy needs improvement. ';
  if (!latestMock) explanation += 'No mock data yet. ';
  if (taskPct < 0.3) explanation += 'Early in task coverage. ';
  if (!explanation) explanation = 'Keep up the momentum!';

  return { score, taskScore, srScore, questionScore, mockScore, explanation };
}

// ── Daily recommendation ──────────────────────────────────────────────────────

export function getDailyRecommendation({ logs, tasks, srRecords, userSettings, questionLogs, mistakeLogs }) {
  const mainTask = getNextTask(logs, tasks);
  const srDue = getSRDue(srRecords, userSettings);
  const deficit = getDeficit(logs, tasks);
  const qTarget = userSettings?.daily_question_target || 40;
  const todayQLogs = (questionLogs || []).filter(q => q.date === format(new Date(), 'yyyy-MM-dd'));
  const todayQDone = todayQLogs.reduce((s, q) => s + (q.questions_done || 0), 0);
  const questionTarget = Math.max(qTarget, qTarget + Math.min(deficit, 20));

  const warnings = [];
  if (deficit > 40) warnings.push(`You are ${deficit} questions behind target.`);
  if (srDue.filter(s => s.overdue).length > 0) warnings.push(`${srDue.filter(s => s.overdue).length} SR review(s) are overdue.`);

  const srLabel = srDue.length > 0
    ? `${srDue.length} SR review${srDue.length > 1 ? 's' : ''} due`
    : 'No SR due today';

  let message = '';
  if (mainTask) {
    message = `Focus on ${mainTask.title.split('—')[0].trim()}.`;
    if (srDue.length > 0) message += ` ${srLabel}.`;
    if (deficit > 0) message += ` Aim for ${questionTarget} questions to catch up.`;
    else message += ` Target ${qTarget} questions today.`;
  } else {
    message = 'All tasks complete! Focus on SR reviews and mock exams.';
  }

  return { mainTask, srDue, questionTarget, deficit, todayQDone, warnings, message, srLabel };
}

// ── Blueprint balance ─────────────────────────────────────────────────────────

export function getBlueprintBalance(subjects, tasks, logs, questionLogs) {
  const completedTaskIds = new Set(
    logs.filter(l => l.status === 'complete').map(l => l.task_id || String(l.task_num))
  );
  const categories = {};

  (subjects || []).forEach(sub => {
    const cat = sub.blueprint_category || 'Other';
    if (!categories[cat]) categories[cat] = { total: 0, completed: 0, questions: 0, correct: 0 };
    const subTasks = (tasks || []).filter(t => t.subject_id === sub.id);
    categories[cat].total += subTasks.length;
    categories[cat].completed += subTasks.filter(t => completedTaskIds.has(t.id) || completedTaskIds.has(String(t.sort_order))).length;
    const subQLogs = (questionLogs || []).filter(q => q.subject_id === sub.id);
    categories[cat].questions += subQLogs.reduce((s, q) => s + (q.questions_done || 0), 0);
    categories[cat].correct += subQLogs.reduce((s, q) => s + (q.correct_count || 0), 0);
  });

  return Object.entries(categories).map(([cat, data]) => ({
    category: cat,
    completionPct: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    questions: data.questions,
    accuracy: data.questions > 0 ? Math.round((data.correct / data.questions) * 100) : null,
    ...data,
  }));
}
