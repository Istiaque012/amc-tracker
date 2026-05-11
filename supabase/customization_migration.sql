-- AMC Tracker — Customisation Migration
-- Safe to run once on Supabase SQL editor.
-- Uses IF NOT EXISTS and DO $$ blocks throughout.

-- ============================================================
-- 1. user_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  exam_name text DEFAULT 'AMC MCQ',
  exam_date date DEFAULT '2026-08-17',
  study_start_date date DEFAULT '2026-05-04',
  question_bank_name text DEFAULT 'eMedici',
  sr1_interval integer DEFAULT 7,
  sr2_multiplier numeric DEFAULT 1.5,
  sr3_multiplier numeric DEFAULT 2.0,
  grace_period_days integer DEFAULT 2,
  rest_days_per_month integer DEFAULT 6,
  tier1_sr_hits integer DEFAULT 3,
  tier2_sr_hits integer DEFAULT 2,
  tier3_sr_hits integer DEFAULT 1,
  daily_question_target integer DEFAULT 40,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_settings' AND policyname='Users own their settings') THEN
    CREATE POLICY "Users own their settings" ON user_settings FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 2. subjects
-- ============================================================
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  blueprint_category text,
  class_count integer DEFAULT 1,
  emedici_target integer DEFAULT 40,
  tier integer CHECK (tier IN (1,2,3)) DEFAULT 2,
  sr_hits integer CHECK (sr_hits IN (1,2,3)) DEFAULT 2,
  is_active boolean DEFAULT true,
  sort_order integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subjects' AND policyname='Users own their subjects') THEN
    CREATE POLICY "Users own their subjects" ON subjects FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 3. phases
-- ============================================================
CREATE TABLE IF NOT EXISTS phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL,
  target_completion_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE phases ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='phases' AND policyname='Users own their phases') THEN
    CREATE POLICY "Users own their phases" ON phases FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 4. tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  phase_id uuid REFERENCES phases(id) ON DELETE SET NULL,
  title text NOT NULL,
  phase integer CHECK (phase IN (1,2,3)) DEFAULT 1,
  emedici_qty integer DEFAULT 0,
  is_milestone boolean DEFAULT false,
  is_mock boolean DEFAULT false,
  is_custom boolean DEFAULT false,
  sort_order integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tasks' AND policyname='Users own their tasks') THEN
    CREATE POLICY "Users own their tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 5. schedule_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS schedule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  blocks jsonb DEFAULT '[]',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='schedule_templates' AND policyname='Users own their templates') THEN
    CREATE POLICY "Users own their templates" ON schedule_templates FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 6. schedule_template_assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS schedule_template_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer CHECK (day_of_week BETWEEN 0 AND 6) NOT NULL,
  template_id uuid REFERENCES schedule_templates(id) ON DELETE SET NULL,
  UNIQUE(user_id, day_of_week)
);

ALTER TABLE schedule_template_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='schedule_template_assignments' AND policyname='Users own their assignments') THEN
    CREATE POLICY "Users own their assignments" ON schedule_template_assignments FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 7. question_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS question_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  question_bank_name text DEFAULT 'eMedici',
  questions_done integer DEFAULT 0,
  correct_count integer DEFAULT 0,
  incorrect_count integer DEFAULT 0,
  mode text CHECK (mode IN ('timed','untimed','mixed')) DEFAULT 'untimed',
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE question_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='question_logs' AND policyname='Users own their question logs') THEN
    CREATE POLICY "Users own their question logs" ON question_logs FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 8. mistake_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS mistake_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date DEFAULT CURRENT_DATE,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  question_bank_name text DEFAULT 'eMedici',
  mistake_type text,
  clinical_area text,
  short_note text,
  correction_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mistake_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mistake_logs' AND policyname='Users own their mistake logs') THEN
    CREATE POLICY "Users own their mistake logs" ON mistake_logs FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 9. mock_exams
-- ============================================================
CREATE TABLE IF NOT EXISTS mock_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  date date,
  total_questions integer DEFAULT 150,
  correct_count integer DEFAULT 0,
  incorrect_count integer DEFAULT 0,
  percentage numeric,
  time_minutes integer DEFAULT 210,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mock_exams ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mock_exams' AND policyname='Users own their mock exams') THEN
    CREATE POLICY "Users own their mock exams" ON mock_exams FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 10. mock_exam_breakdown
-- ============================================================
CREATE TABLE IF NOT EXISTS mock_exam_breakdown (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mock_exam_id uuid REFERENCES mock_exams(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  blueprint_category text,
  total_questions integer DEFAULT 0,
  correct_count integer DEFAULT 0,
  incorrect_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mock_exam_breakdown ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mock_exam_breakdown' AND policyname='Users own their mock breakdown') THEN
    CREATE POLICY "Users own their mock breakdown" ON mock_exam_breakdown FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 11. Alter existing study_log — add task_id and question_log_id if missing
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='study_log' AND column_name='task_id') THEN
    ALTER TABLE study_log ADD COLUMN task_id uuid REFERENCES tasks(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='study_log' AND column_name='question_log_id') THEN
    ALTER TABLE study_log ADD COLUMN question_log_id uuid REFERENCES question_logs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 12. Alter existing sr_records — add subject_id and max_hits if missing
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sr_records' AND column_name='subject_id') THEN
    ALTER TABLE sr_records ADD COLUMN subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sr_records' AND column_name='max_hits') THEN
    ALTER TABLE sr_records ADD COLUMN max_hits integer DEFAULT 3;
  END IF;
END $$;

-- ============================================================
-- Updated_at triggers for new tables
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='user_settings_updated_at') THEN
    CREATE TRIGGER user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='subjects_updated_at') THEN
    CREATE TRIGGER subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='phases_updated_at') THEN
    CREATE TRIGGER phases_updated_at BEFORE UPDATE ON phases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='tasks_updated_at') THEN
    CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='schedule_templates_updated_at') THEN
    CREATE TRIGGER schedule_templates_updated_at BEFORE UPDATE ON schedule_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='question_logs_updated_at') THEN
    CREATE TRIGGER question_logs_updated_at BEFORE UPDATE ON question_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='mistake_logs_updated_at') THEN
    CREATE TRIGGER mistake_logs_updated_at BEFORE UPDATE ON mistake_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='mock_exams_updated_at') THEN
    CREATE TRIGGER mock_exams_updated_at BEFORE UPDATE ON mock_exams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
