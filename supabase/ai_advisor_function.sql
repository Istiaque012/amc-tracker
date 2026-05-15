-- ============================================================================
-- get_ai_advisor_data(p_user_id uuid) → JSON
-- Returns a comprehensive study-state snapshot for the AI Study Advisor.
-- Run this in Supabase SQL Editor to create/replace the function.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_ai_advisor_data(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tasks_done       integer;
  v_tasks_total      integer;
  v_tasks_missed     integer;
  v_current_task     record;
  v_emedici_target   bigint;
  v_emedici_actual   bigint;
  v_emedici_deficit  integer;
  v_sr_overdue_count integer;
  v_sr_overdue_arr   json;
  v_streak           integer;
  v_exam_date        date;
  v_study_start      date;
  v_days_to_exam     integer;
  v_week_complete    integer;
  v_week_missed      integer;
  v_sr_hits_done     integer;
  v_sr_hits_due      integer;
  v_readiness        numeric;
  v_pace_current     numeric;
  v_pace_needed      numeric;
  v_retention_map    json;
  v_weeks_elapsed    numeric;
  v_weeks_remaining  numeric;
  v_sr_compliance    numeric;
  v_emedici_score    numeric;
  v_week_start       date;
BEGIN
  -- ── tasks_done, tasks_total, tasks_missed ─────────────────────────────
  SELECT COALESCE(COUNT(*) FILTER (WHERE sl.status = 'complete'), 0),
         COALESCE(COUNT(*) FILTER (WHERE sl.status = 'missed'), 0)
    INTO v_tasks_done, v_tasks_missed
    FROM study_log sl
   WHERE sl.user_id = p_user_id;

  SELECT COALESCE(COUNT(*), 0)
    INTO v_tasks_total
    FROM tasks
   WHERE user_id = p_user_id;

  -- ── current_task (next incomplete — lowest sort_order not yet done) ────
  SELECT t.id, t.title
    INTO v_current_task
    FROM tasks t
   WHERE t.user_id = p_user_id
     AND NOT EXISTS (
       SELECT 1 FROM study_log sl
        WHERE sl.user_id = p_user_id
          AND sl.status = 'complete'
          AND (sl.task_id = t.id OR sl.task_num = t.sort_order)
     )
   ORDER BY t.sort_order ASC
   LIMIT 1;

  -- ── emedici_deficit ───────────────────────────────────────────────────
  SELECT COALESCE(SUM(t.emedici_qty), 0)
    INTO v_emedici_target
    FROM tasks t
    JOIN study_log sl ON sl.user_id = p_user_id
         AND sl.status = 'complete'
         AND (sl.task_id = t.id OR sl.task_num = t.sort_order)
   WHERE t.user_id = p_user_id;

  SELECT COALESCE(SUM(sl.e_medici), 0)
    INTO v_emedici_actual
    FROM study_log sl
   WHERE sl.user_id = p_user_id;

  v_emedici_deficit := GREATEST(0, v_emedici_target - v_emedici_actual);

  -- ── sr_overdue_count + sr_overdue_details ─────────────────────────────
  SELECT COALESCE(COUNT(*), 0)
    INTO v_sr_overdue_count
    FROM sr_records sr
   WHERE sr.user_id = p_user_id
     AND (
       (sr.sr1_due < CURRENT_DATE AND sr.sr1_done = false)
       OR (sr.sr2_due IS NOT NULL AND sr.sr2_due < CURRENT_DATE AND sr.sr2_done = false)
       OR (sr.sr3_due IS NOT NULL AND sr.sr3_due < CURRENT_DATE AND sr.sr3_done = false)
     );

  SELECT COALESCE(json_agg(item), '[]'::json)
    INTO v_sr_overdue_arr
    FROM (
      SELECT sr.subject_name,
             CASE
               WHEN sr.sr1_due < CURRENT_DATE AND sr.sr1_done = false THEN 'sr1'
               WHEN sr.sr2_due IS NOT NULL AND sr.sr2_due < CURRENT_DATE AND sr.sr2_done = false THEN 'sr2'
               WHEN sr.sr3_due IS NOT NULL AND sr.sr3_due < CURRENT_DATE AND sr.sr3_done = false THEN 'sr3'
             END AS overdue_hit
        FROM sr_records sr
       WHERE sr.user_id = p_user_id
         AND (
           (sr.sr1_due < CURRENT_DATE AND sr.sr1_done = false)
           OR (sr.sr2_due IS NOT NULL AND sr.sr2_due < CURRENT_DATE AND sr.sr2_done = false)
           OR (sr.sr3_due IS NOT NULL AND sr.sr3_due < CURRENT_DATE AND sr.sr3_done = false)
         )
    ) item;

  -- ── streak (consecutive complete days ending today or yesterday) ──────
  v_streak := 0;
  DECLARE
    v_check_date date := CURRENT_DATE;
    v_has_today  boolean;
  BEGIN
    -- Check if today is complete
    SELECT EXISTS(
      SELECT 1 FROM study_log sl
       WHERE sl.user_id = p_user_id AND sl.date = CURRENT_DATE AND sl.status = 'complete'
    ) INTO v_has_today;

    IF NOT v_has_today THEN
      v_check_date := CURRENT_DATE - 1;
    END IF;

    LOOP
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM study_log sl
         WHERE sl.user_id = p_user_id AND sl.date = v_check_date AND sl.status = 'complete'
      );
      v_streak := v_streak + 1;
      v_check_date := v_check_date - 1;
    END LOOP;
  END;

  -- ── exam_date, days_to_exam, study_start ──────────────────────────────
  SELECT us.exam_date::date, us.study_start_date::date
    INTO v_exam_date, v_study_start
    FROM user_settings us
   WHERE us.user_id = p_user_id
   LIMIT 1;

  v_exam_date    := COALESCE(v_exam_date, '2026-08-17'::date);
  v_study_start  := COALESCE(v_study_start, '2026-05-04'::date);
  v_days_to_exam := GREATEST(0, v_exam_date - CURRENT_DATE);

  -- ── this_week_complete, this_week_missed (Monday → today) ─────────────
  v_week_start := date_trunc('week', CURRENT_DATE)::date;  -- Monday

  SELECT COALESCE(COUNT(*) FILTER (WHERE sl.status = 'complete'), 0),
         COALESCE(COUNT(*) FILTER (WHERE sl.status = 'missed'), 0)
    INTO v_week_complete, v_week_missed
    FROM study_log sl
   WHERE sl.user_id = p_user_id
     AND sl.date >= v_week_start
     AND sl.date <= CURRENT_DATE;

  -- ── SR compliance (hits done / hits due so far) ───────────────────────
  SELECT COALESCE(SUM(
           CASE WHEN sr.sr1_done THEN 1 ELSE 0 END +
           CASE WHEN sr.sr2_done THEN 1 ELSE 0 END +
           CASE WHEN sr.sr3_done THEN 1 ELSE 0 END
         ), 0),
         COALESCE(SUM(
           CASE WHEN sr.sr1_due IS NOT NULL AND sr.sr1_due <= CURRENT_DATE THEN 1 ELSE 0 END +
           CASE WHEN sr.sr2_due IS NOT NULL AND sr.sr2_due <= CURRENT_DATE THEN 1 ELSE 0 END +
           CASE WHEN sr.sr3_due IS NOT NULL AND sr.sr3_due <= CURRENT_DATE THEN 1 ELSE 0 END
         ), 0)
    INTO v_sr_hits_done, v_sr_hits_due
    FROM sr_records sr
   WHERE sr.user_id = p_user_id;

  v_sr_compliance := CASE WHEN v_sr_hits_due > 0
                       THEN v_sr_hits_done::numeric / v_sr_hits_due
                       ELSE 1.0 END;

  -- ── readiness_score ───────────────────────────────────────────────────
  v_emedici_score := GREATEST(0, 30.0 - v_emedici_deficit::numeric / 8.0);
  v_readiness := COALESCE(
    (v_tasks_done::numeric / NULLIF(v_tasks_total, 0) * 40.0), 0
  ) + (v_sr_compliance * 30.0) + v_emedici_score;

  -- ── pace_current & pace_needed ────────────────────────────────────────
  v_weeks_elapsed   := GREATEST(1, (CURRENT_DATE - v_study_start)::numeric / 7.0);
  v_weeks_remaining := GREATEST(1, v_days_to_exam::numeric / 7.0);
  v_pace_current    := ROUND(v_tasks_done::numeric / v_weeks_elapsed, 1);
  v_pace_needed     := ROUND(GREATEST(0, v_tasks_total - v_tasks_done)::numeric / v_weeks_remaining, 1);

  -- ── retention_map ─────────────────────────────────────────────────────
  SELECT COALESCE(json_agg(item), '[]'::json)
    INTO v_retention_map
    FROM (
      SELECT sr.subject_name,
             ROUND(100.0 * EXP(
               -(CURRENT_DATE - COALESCE(
                   CASE WHEN sr.sr3_done THEN sr.sr3_due::date
                        WHEN sr.sr2_done THEN sr.sr2_due::date
                        WHEN sr.sr1_done THEN sr.sr1_due::date
                        ELSE sr.completed_date::date END,
                   sr.completed_date::date
                 ))::numeric
               / (CASE WHEN sr.sr3_done THEN 6
                       WHEN sr.sr2_done THEN 3.5
                       WHEN sr.sr1_done THEN 2
                       ELSE 1 END * 14.0)
             ))::integer AS retention_pct,
             COALESCE(
               CASE WHEN sr.sr3_done THEN sr.sr3_due::text
                    WHEN sr.sr2_done THEN sr.sr2_due::text
                    WHEN sr.sr1_done THEN sr.sr1_due::text
                    ELSE sr.completed_date END,
               sr.completed_date
             ) AS last_review_date
        FROM sr_records sr
       WHERE sr.user_id = p_user_id
         AND sr.completed_date IS NOT NULL
       ORDER BY sr.subject_name
    ) item;

  -- ── Build and return the JSON object ──────────────────────────────────
  RETURN json_build_object(
    'tasks_done',            v_tasks_done,
    'tasks_total',           v_tasks_total,
    'tasks_missed',          v_tasks_missed,
    'current_task_title',    v_current_task.title,
    'current_task_id',       v_current_task.id,
    'emedici_deficit',       v_emedici_deficit,
    'sr_overdue_count',      v_sr_overdue_count,
    'sr_overdue_details',    v_sr_overdue_arr,
    'streak',                v_streak,
    'days_to_exam',          v_days_to_exam,
    'exam_date',             v_exam_date,
    'this_week_complete',    v_week_complete,
    'this_week_missed',      v_week_missed,
    'readiness_score',       ROUND(v_readiness, 1),
    'pace_current',          v_pace_current,
    'pace_needed',           v_pace_needed,
    'retention_map',         v_retention_map
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_ai_advisor_data(uuid) TO authenticated;
