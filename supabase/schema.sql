-- Study log — one row per day
CREATE TABLE IF NOT EXISTS study_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text CHECK (status IN ('complete','partial','missed','rest','pending')),
  task_num integer,
  e_medici integer DEFAULT 0,
  partial_pct integer DEFAULT 0,
  blocks jsonb DEFAULT '[]',
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- SR records — one row per subject per user
CREATE TABLE IF NOT EXISTS sr_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  completed_date date,
  sr1_due date,
  sr1_done boolean DEFAULT false,
  sr1_rating text CHECK (sr1_rating IN ('blackout','hard','medium','easy') OR sr1_rating IS NULL),
  sr1_done_date date,
  sr2_due date,
  sr2_done boolean DEFAULT false,
  sr2_rating text CHECK (sr2_rating IN ('blackout','hard','medium','easy') OR sr2_rating IS NULL),
  sr2_done_date date,
  sr3_due date,
  sr3_done boolean DEFAULT false,
  sr3_rating text CHECK (sr3_rating IN ('blackout','hard','medium','easy') OR sr3_rating IS NULL),
  sr3_done_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, subject_name)
);

-- Row level security
ALTER TABLE study_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sr_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users own their data" ON study_log FOR ALL USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users own their data" ON sr_records FOR ALL USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER study_log_updated_at BEFORE UPDATE ON study_log FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER sr_records_updated_at BEFORE UPDATE ON sr_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
