-- ============================================================
-- Run this entire file in Supabase SQL Editor to set up the
-- complete schema. Safe on a blank project. All statements use
-- IF NOT EXISTS so it can be re-run without destroying data.
-- ============================================================


-- ============================================================
-- TRIGGER FUNCTION — shared by all tables
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 1. user_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_name             text        NOT NULL DEFAULT 'AMC MCQ',
  exam_date             date        NOT NULL DEFAULT '2026-08-17',
  study_start_date      date        NOT NULL DEFAULT '2026-05-04',
  question_bank_name    text        NOT NULL DEFAULT 'eMedici',
  sr1_interval          integer     NOT NULL DEFAULT 7,
  sr2_multiplier        numeric     NOT NULL DEFAULT 1.5,
  sr3_multiplier        numeric     NOT NULL DEFAULT 2.0,
  grace_period_days     integer     NOT NULL DEFAULT 2,
  rest_days_per_month   integer     NOT NULL DEFAULT 6,
  tier1_sr_hits         integer     NOT NULL DEFAULT 3,
  tier2_sr_hits         integer     NOT NULL DEFAULT 2,
  tier3_sr_hits         integer     NOT NULL DEFAULT 1,
  daily_question_target integer     NOT NULL DEFAULT 40,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'user_settings_own'
  ) THEN
    CREATE POLICY user_settings_own ON user_settings FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_settings_updated_at') THEN
    CREATE TRIGGER trg_user_settings_updated_at
      BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;


-- ============================================================
-- 2. phases
-- ============================================================
CREATE TABLE IF NOT EXISTS phases (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                   text        NOT NULL,
  description            text,
  sort_order             integer     NOT NULL DEFAULT 0,
  target_completion_date date,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phases_user ON phases(user_id);
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'phases' AND policyname = 'phases_own') THEN
    CREATE POLICY phases_own ON phases FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_phases_updated_at') THEN
    CREATE TRIGGER trg_phases_updated_at
      BEFORE UPDATE ON phases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;


-- ============================================================
-- 3. subjects  (milestone_task_id FK added after tasks)
-- ============================================================
CREATE TABLE IF NOT EXISTS subjects (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name               text        NOT NULL,
  blueprint_category text,
  class_count        integer     NOT NULL DEFAULT 1,
  emedici_target     integer     NOT NULL DEFAULT 40,
  tier               integer     NOT NULL DEFAULT 2 CHECK (tier IN (1,2,3)),
  sr_hits            integer     NOT NULL DEFAULT 2 CHECK (sr_hits IN (1,2,3)),
  milestone_task_id  uuid,
  is_active          boolean     NOT NULL DEFAULT true,
  sort_order         integer     NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_subjects_user ON subjects(user_id);
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subjects' AND policyname = 'subjects_own') THEN
    CREATE POLICY subjects_own ON subjects FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_subjects_updated_at') THEN
    CREATE TRIGGER trg_subjects_updated_at
      BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;


-- ============================================================
-- 4. tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id   uuid        REFERENCES subjects(id) ON DELETE SET NULL,
  phase_id     uuid        REFERENCES phases(id)   ON DELETE SET NULL,
  title        text        NOT NULL,
  subject      text,
  phase        integer     NOT NULL DEFAULT 1 CHECK (phase IN (1,2,3)),
  emedici_qty  integer     NOT NULL DEFAULT 0,
  is_milestone boolean     NOT NULL DEFAULT false,
  is_mock      boolean     NOT NULL DEFAULT false,
  is_custom    boolean     NOT NULL DEFAULT false,
  sort_order   integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user       ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_subject    ON tasks(subject_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(user_id, sort_order);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_own') THEN
    CREATE POLICY tasks_own ON tasks FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tasks_updated_at') THEN
    CREATE TRIGGER trg_tasks_updated_at
      BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;


-- Resolve circular FK: subjects.milestone_task_id → tasks
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_subjects_milestone_task' AND table_name = 'subjects'
  ) THEN
    ALTER TABLE subjects
      ADD CONSTRAINT fk_subjects_milestone_task
      FOREIGN KEY (milestone_task_id) REFERENCES tasks(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ============================================================
-- 5. schedule_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS schedule_templates (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  is_default boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_templates_user ON schedule_templates(user_id);
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_templates' AND policyname = 'schedule_templates_own') THEN
    CREATE POLICY schedule_templates_own ON schedule_templates FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_schedule_templates_updated_at') THEN
    CREATE TRIGGER trg_schedule_templates_updated_at
      BEFORE UPDATE ON schedule_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;


-- ============================================================
-- 6. schedule_blocks  (one row per block, replaces jsonb)
-- ============================================================
CREATE TABLE IF NOT EXISTS schedule_blocks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid        NOT NULL REFERENCES schedule_templates(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label       text        NOT NULL,
  start_time  text        NOT NULL,
  end_time    text        NOT NULL,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_blocks_template ON schedule_blocks(template_id);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_user     ON schedule_blocks(user_id);
ALTER TABLE schedule_blocks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_blocks' AND policyname = 'schedule_blocks_own') THEN
    CREATE POLICY schedule_blocks_own ON schedule_blocks FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;


-- ============================================================
-- 7. schedule_template_assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS schedule_template_assignments (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  template_id uuid    REFERENCES schedule_templates(id) ON DELETE SET NULL,
  UNIQUE (user_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_sta_user ON schedule_template_assignments(user_id);
ALTER TABLE schedule_template_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_template_assignments' AND policyname = 'sta_own') THEN
    CREATE POLICY sta_own ON schedule_template_assignments FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;


-- ============================================================
-- 8. study_log
-- ============================================================
CREATE TABLE IF NOT EXISTS study_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        date        NOT NULL,
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('complete','partial','missed','rest','pending')),
  task_num    integer,
  task_id     uuid        REFERENCES tasks(id) ON DELETE SET NULL,
  e_medici    integer     NOT NULL DEFAULT 0,
  partial_pct integer     NOT NULL DEFAULT 0,
  blocks      jsonb       NOT NULL DEFAULT '[]',
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_study_log_user ON study_log(user_id);
CREATE INDEX IF NOT EXISTS idx_study_log_date ON study_log(user_id, date);
ALTER TABLE study_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'study_log' AND policyname = 'study_log_own') THEN
    CREATE POLICY study_log_own ON study_log FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_study_log_updated_at') THEN
    CREATE TRIGGER trg_study_log_updated_at
      BEFORE UPDATE ON study_log FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;


-- ============================================================
-- 9. sr_records
-- ============================================================
CREATE TABLE IF NOT EXISTS sr_records (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id     uuid        REFERENCES subjects(id) ON DELETE SET NULL,
  subject_name   text        NOT NULL,
  max_hits       integer     NOT NULL DEFAULT 3 CHECK (max_hits IN (1,2,3)),
  completed_date date,
  sr1_due        date,
  sr1_done       boolean     NOT NULL DEFAULT false,
  sr1_done_date  date,
  sr1_rating     text        CHECK (sr1_rating IN ('easy','medium','hard','blackout')),
  sr2_due        date,
  sr2_done       boolean     NOT NULL DEFAULT false,
  sr2_done_date  date,
  sr2_rating     text        CHECK (sr2_rating IN ('easy','medium','hard','blackout')),
  sr3_due        date,
  sr3_done       boolean     NOT NULL DEFAULT false,
  sr3_done_date  date,
  sr3_rating     text        CHECK (sr3_rating IN ('easy','medium','hard','blackout')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, subject_name)
);

CREATE INDEX IF NOT EXISTS idx_sr_records_user    ON sr_records(user_id);
CREATE INDEX IF NOT EXISTS idx_sr_records_subject ON sr_records(subject_id);
ALTER TABLE sr_records ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sr_records' AND policyname = 'sr_records_own') THEN
    CREATE POLICY sr_records_own ON sr_records FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sr_records_updated_at') THEN
    CREATE TRIGGER trg_sr_records_updated_at
      BEFORE UPDATE ON sr_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;


-- ============================================================
-- 10. question_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS question_logs (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date               date        NOT NULL,
  subject_id         uuid        REFERENCES subjects(id) ON DELETE SET NULL,
  task_id            uuid        REFERENCES tasks(id)    ON DELETE SET NULL,
  question_bank_name text        NOT NULL DEFAULT 'eMedici',
  questions_done     integer     NOT NULL DEFAULT 0,
  correct_count      integer     NOT NULL DEFAULT 0,
  incorrect_count    integer     NOT NULL DEFAULT 0,
  mode               text        NOT NULL DEFAULT 'untimed'
                                 CHECK (mode IN ('timed','untimed','mixed')),
  note               text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_question_logs_user    ON question_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_question_logs_date    ON question_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_question_logs_subject ON question_logs(subject_id);
ALTER TABLE question_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'question_logs' AND policyname = 'question_logs_own') THEN
    CREATE POLICY question_logs_own ON question_logs FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_question_logs_updated_at') THEN
    CREATE TRIGGER trg_question_logs_updated_at
      BEFORE UPDATE ON question_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;


-- ============================================================
-- 11. mock_exams
-- ============================================================
CREATE TABLE IF NOT EXISTS mock_exams (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text        NOT NULL,
  date            date,
  total_questions integer     NOT NULL DEFAULT 150,
  correct_count   integer     NOT NULL DEFAULT 0,
  incorrect_count integer     NOT NULL DEFAULT 0,
  percentage      numeric,
  time_minutes    integer     NOT NULL DEFAULT 210,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mock_exams_user ON mock_exams(user_id);
ALTER TABLE mock_exams ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mock_exams' AND policyname = 'mock_exams_own') THEN
    CREATE POLICY mock_exams_own ON mock_exams FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_mock_exams_updated_at') THEN
    CREATE TRIGGER trg_mock_exams_updated_at
      BEFORE UPDATE ON mock_exams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;


-- mock_exam_breakdown
CREATE TABLE IF NOT EXISTS mock_exam_breakdown (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mock_exam_id       uuid        NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  subject_id         uuid        REFERENCES subjects(id) ON DELETE SET NULL,
  blueprint_category text,
  total_questions    integer     NOT NULL DEFAULT 0,
  correct_count      integer     NOT NULL DEFAULT 0,
  incorrect_count    integer     NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mock_breakdown_exam ON mock_exam_breakdown(mock_exam_id);
CREATE INDEX IF NOT EXISTS idx_mock_breakdown_user ON mock_exam_breakdown(user_id);
ALTER TABLE mock_exam_breakdown ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mock_exam_breakdown' AND policyname = 'mock_exam_breakdown_own') THEN
    CREATE POLICY mock_exam_breakdown_own ON mock_exam_breakdown FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;


-- ============================================================
-- 12. mistake_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS mistake_logs (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date               date        NOT NULL DEFAULT CURRENT_DATE,
  subject_id         uuid        REFERENCES subjects(id) ON DELETE SET NULL,
  task_id            uuid        REFERENCES tasks(id)    ON DELETE SET NULL,
  question_bank_name text        NOT NULL DEFAULT 'eMedici',
  mistake_type       text        CHECK (mistake_type IN (
                       'diagnosis_gap','investigation_error','management_error',
                       'red_flag_missed','guideline_confusion','misread_question',
                       'time_pressure','ethics_legal','other')),
  clinical_area      text,
  short_note         text,
  correction_note    text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mistake_logs_user    ON mistake_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mistake_logs_subject ON mistake_logs(subject_id);
ALTER TABLE mistake_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mistake_logs' AND policyname = 'mistake_logs_own') THEN
    CREATE POLICY mistake_logs_own ON mistake_logs FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_mistake_logs_updated_at') THEN
    CREATE TRIGGER trg_mistake_logs_updated_at
      BEFORE UPDATE ON mistake_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
