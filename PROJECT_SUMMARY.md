# AMC Tracker — Project Summary

**Generated:** 2026-05-12  
**Repository:** `git@github.com:Istiaque012/amc-tracker.git`  
**Supabase project:** `rvinbqthfczinflksyfb.supabase.co`  
**Dev server:** `npm run dev` → `http://localhost:5173`

---

## Tech Stack & Dependencies

| Layer | Technology | Version |
|---|---|---|
| Framework | React | 18.3.1 |
| Build tool | Vite | 5.4.19 |
| Routing | React Router DOM | 6.30.1 |
| Styling | Tailwind CSS | 3.4.17 |
| Backend / Auth / DB | Supabase JS | 2.49.4 |
| Charts | Recharts | 2.15.3 |
| Icons | Lucide React | 0.511.0 |
| Date utilities | date-fns | 3.6.0 |
| PostCSS / Autoprefixer | dev | 8.5.3 / 10.4.21 |

**Fonts (loaded via index.css / globals.css):**
- `DM Serif Display` — headings (`font-serif`)
- `Nunito` — body text (`font-sans`)
- `DM Mono` — numbers and code (`font-mono`)

**Colour palette (custom CSS variables / hardcoded hex):**
- Navy `#0F2744` — primary brand / sidebar
- Blue `#3B82F6` — Phase 1 / active states
- Purple `#8B5CF6` — Phase 2
- Green `#10B981` — Phase 3 / success
- Amber `#F59E0B` — warnings / SR due
- Red `#EF4444` — danger / overdue
- Slate `#F8FAFC` — page background

---

## Database Tables

All tables live in the Supabase `public` schema. Every table has RLS enabled with a `auth.uid() = user_id` policy. All `updated_at` columns are kept current by a shared `update_updated_at()` trigger function.

### Base tables (must exist before customisation tables)

#### `study_log`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | auto |
| `user_id` | uuid FK→auth.users | cascade delete |
| `date` | date | UNIQUE per user |
| `status` | text | `complete`, `partial`, `missed`, `rest`, `pending` |
| `task_num` | integer | legacy sort_order reference |
| `task_id` | uuid FK→tasks | added by migration; nullable |
| `e_medici` | integer | questions done that day |
| `partial_pct` | integer | 0–100, used when status=partial |
| `blocks` | jsonb | array of `{label, time, done, note}` |
| `note` | text | free text |
| `question_log_id` | uuid FK→question_logs | added by migration; nullable |
| `created_at` / `updated_at` | timestamptz | |

#### `sr_records`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→auth.users | |
| `subject_name` | text | UNIQUE per user |
| `subject_id` | uuid FK→subjects | added by migration; nullable |
| `completed_date` | date | when milestone task was completed |
| `sr1_due` / `sr1_done` / `sr1_done_date` / `sr1_rating` | date/bool/date/text | |
| `sr2_due` / `sr2_done` / `sr2_done_date` / `sr2_rating` | date/bool/date/text | |
| `sr3_due` / `sr3_done` / `sr3_done_date` / `sr3_rating` | date/bool/date/text | |
| `max_hits` | integer | added by migration; default 3 |
| `created_at` / `updated_at` | timestamptz | |

### Customisation tables

#### `user_settings`
| Column | Type | Default |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK UNIQUE | |
| `exam_name` | text | `AMC MCQ` |
| `exam_date` | date | `2026-08-17` |
| `study_start_date` | date | `2026-05-04` |
| `question_bank_name` | text | `eMedici` |
| `sr1_interval` | integer | `7` |
| `sr2_multiplier` | numeric | `1.5` |
| `sr3_multiplier` | numeric | `2.0` |
| `grace_period_days` | integer | `2` |
| `rest_days_per_month` | integer | `6` |
| `tier1_sr_hits` / `tier2_sr_hits` / `tier3_sr_hits` | integer | 3 / 2 / 1 |
| `daily_question_target` | integer | `40` |

#### `subjects`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `name` | text | UNIQUE per user |
| `blueprint_category` | text | e.g. `Adult Medicine`, `Child Health` |
| `class_count` | integer | how many class/watch tasks to generate |
| `emedici_target` | integer | target questions for milestone task |
| `tier` | integer | 1, 2, or 3 (controls SR hit count) |
| `sr_hits` | integer | 1, 2, or 3 |
| `milestone_task_id` | uuid FK→tasks | set after task creation; nullable |
| `is_active` | boolean | soft-delete flag |
| `sort_order` | integer | display order |

#### `phases`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `name` | text | e.g. `Phase 1 — Subject Coverage` |
| `description` | text | |
| `sort_order` | integer | |
| `target_completion_date` | date | optional |

#### `tasks`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `subject_id` | uuid FK→subjects | nullable |
| `phase_id` | uuid FK→phases | nullable |
| `subject` | text | denormalised subject name for display |
| `title` | text | |
| `phase` | integer | 1, 2, or 3 |
| `emedici_qty` | integer | target questions for this task |
| `is_milestone` | boolean | milestone tasks trigger SR creation |
| `is_mock` | boolean | |
| `is_custom` | boolean | user-created vs seeded |
| `sort_order` | integer | determines task sequence |

#### `schedule_templates`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `name` | text | e.g. `CD Path Day`, `Gym Day` |
| `blocks` | jsonb | array of `{label, start, end}` |
| `is_default` | boolean | |

#### `schedule_template_assignments`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `day_of_week` | integer | 0=Sun … 6=Sat; UNIQUE per user |
| `template_id` | uuid FK→schedule_templates | nullable (no template assigned) |

#### `question_logs`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `date` | date | |
| `subject_id` | uuid FK→subjects | nullable |
| `task_id` | uuid FK→tasks | nullable |
| `question_bank_name` | text | default `eMedici` |
| `questions_done` | integer | |
| `correct_count` | integer | |
| `incorrect_count` | integer | |
| `mode` | text | `timed`, `untimed`, `mixed` |
| `note` | text | |

#### `mistake_logs`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `date` | date | |
| `subject_id` / `task_id` | uuid FK | nullable |
| `question_bank_name` | text | |
| `mistake_type` | text | one of 9 enum values (see `MISTAKE_TYPES`) |
| `clinical_area` | text | |
| `short_note` | text | what went wrong |
| `correction_note` | text | what the correct answer/reasoning is |

#### `mock_exams`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `title` | text | exam sitting name |
| `date` | date | |
| `total_questions` | integer | default 150 |
| `correct_count` / `incorrect_count` | integer | |
| `percentage` | numeric | auto-calculated on insert/update |
| `time_minutes` | integer | default 210 |
| `notes` | text | |

#### `mock_exam_breakdown`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `mock_exam_id` | uuid FK→mock_exams | cascade delete |
| `subject_id` | uuid FK→subjects | nullable |
| `blueprint_category` | text | |
| `total_questions` / `correct_count` / `incorrect_count` | integer | per-category breakdown |

---

## Screens

### `/` — Dashboard (`src/screens/Dashboard.jsx`)
The main overview page. Receives all data as props from `App.jsx`.

**What it shows:**
- Date header with dynamic exam name and date from `user_settings`
- **Today's Recommendation card** — generated by `getDailyRecommendation()`; shows the next task, SR due count, question target vs done, and any warnings
- **Today's Task card** — the next incomplete task from `tasks` table; links to `/today` to log
- **SR Due alerts** — up to 4 cards for SR1/SR2/SR3 overdue or due today
- **6 metric cards** — Tasks Done, Subjects Done, Streak, Question bank total, Deficit, Days to Exam
- **Phase progress bars** — Phase 1 / 2 / 3 task completion bars
- **Readiness Gauge** (right column) — SVG half-dial, 0–99 score with explanation text
- **Phase Rings** (right column) — three SVG donut rings for phase completion
- **Exam Countdown** (right column) — large day count
- **Score Breakdown** (right column) — four mini progress bars: Tasks (35), SR (25), Questions (25), Mocks (15)

---

### `/today` — Today (`src/screens/Today.jsx`)
Daily study session tracker.

**What it shows:**
- Date header with schedule template name and block count
- **Task info card** — current task title, phase, question bank target
- **SR alert banner** — lists any SR reviews due today
- **Block completion progress bar**
- **Study blocks list** — checklist of timed blocks pulled from the assigned schedule template; each block has a checkbox and a free-text note field; blocks are persisted to `study_log.blocks` on toggle
- **Add Block** button — appends a custom block
- **Pomodoro Timer** (right sidebar) — 50 min work / 10 min break / 30 min long break
- **Log Today / Edit Today's Log** button — opens the log modal
- **Quick Stats card** — blocks done, task #, question bank target, done, deficit

**Log modal contains:**
- Status picker (Complete / Partial / Missed / Rest Day)
- Partial completion slider (10–90%)
- Question bank questions done (integer)
- **Quick Question Log section** — optional; subject picker (from `subjects`), questions done, correct count; saves a new `question_logs` row on submit

---

### `/plan` — Study Plan (`src/screens/Plan.jsx`)
Full task list with filtering and inline log editing.

**What it shows:**
- Filter bar: All / Done / Upcoming / Phase 1 / Phase 2 / Phase 3
- Text search across title and subject
- Table with columns: #, Task, Subject, Phase, Question Bank qty, Status badge, Projected/actual date, Edit pencil
- Projected dates calculated by `getProjectedDates(logs, tasks, settings)` accounting for `rest_days_per_month`
- Edit modal for completed tasks (change status and question count, or delete the log entry)

---

### `/sr` — SR Module (`src/screens/SRModule.jsx`)
Spaced repetition review hub.

**What it shows:**
- Summary line: subjects completed vs SR due today
- **SR Protocol card** — shows dynamic interval labels computed from `user_settings` (sr1_interval, sr2_multiplier, sr3_multiplier)
- **SRSubjectCard list** — one collapsible card per completed subject; shows retention %, SR1/SR2/SR3 status badges, due dates, ratings; "Mark Done →" button triggers the SR modal
- **SR Compliance donut** (right sidebar) — Done / Pending / Overdue pie chart
- **Due Today list** (right sidebar)
- **Next 7 Days list** (right sidebar)

**SR modal** — rates recall quality: Blackout / Hard / Medium / Easy. Updates the appropriate `sr_done`, `sr_done_date`, `sr_rating`, and the next hit's `sr_due` in `sr_records`. The multipliers from `user_settings` determine the next interval.

---

### `/analytics` — Analytics (`src/screens/Analytics.jsx`)
Nine visualisation panels, stacked vertically.

| Panel | Chart type | Data source | Notes |
|---|---|---|---|
| Ebbinghaus Forgetting Curves | Custom SVG path | `sr_records` + `logs` | Animated dots; sawtooth jumps on SR review dates |
| SR Review Timeline | Custom SVG Gantt | `sr_records` | Colour-coded dots: green=done, red=overdue, amber=today |
| Question Bank Progress | Recharts AreaChart | `study_log` | Cumulative done vs target; **broken** — still uses `TASKS` constant |
| Blueprint Balance | Recharts BarChart | `subjects`, `tasks`, `logs`, `question_logs` | Task completion % and question accuracy % by blueprint category |
| Mock Exam Trend | Recharts LineChart | `mock_exams` | Score progression over sittings |
| Mistake Analysis | Recharts BarChart (horizontal) | `mistake_logs` | Count per mistake type |
| Subject Retention Map | CSS grid | `sr_records` + `logs` | **Broken** — uses `SUBJECTS` constant instead of `subjects` prop |
| Study Activity Heatmap | Custom CSS grid | `study_log` | GitHub-style calendar from `CHART_START` to `EXAM_DATE`; **broken** — uses hardcoded `CHART_START`/`EXAM_DATE` constants |
| SR Compliance Donut | Recharts PieChart | `sr_records` | Done / Pending / Overdue |

---

### `/settings` — Settings (`src/screens/Settings.jsx`)
Seven-tab configuration centre. All hooks are called internally (not from App.jsx).

| Tab | What it manages |
|---|---|
| **Exam Setup** | `exam_name`, `exam_date`, `study_start_date`, `question_bank_name`, `rest_days_per_month`, `daily_question_target`; live preview card |
| **Subjects** | Full CRUD table; add triggers auto-generation of class tasks + milestone task in `tasks`; delete cascades SR records and tasks; up/down reorder |
| **Tasks** | Filterable/searchable table; inline edit (title, phase, question qty, milestone flag); add/delete modals |
| **SR Settings** | `sr1_interval`, `sr2_multiplier`, `sr3_multiplier`, `grace_period_days`, tier SR hit counts with live preview of computed intervals |
| **Schedule** | Day-of-week grid assigning templates to days; template CRUD with block editor (label, start time, end time per block) |
| **Phases** | Phase CRUD; shows task count per phase; up/down reorder |
| **Import / Export** | JSON export of all user data (settings, subjects, tasks, phases, study_log, sr_records); import is a placeholder (not implemented) |

---

### `/auth` — Auth (`src/screens/Auth.jsx`)
Sign-in / sign-up form. Supabase email+password auth. Shown when no session exists; all other routes redirect here.

---

## Component Files

### Layout

| File | Renders |
|---|---|
| `Layout.jsx` | Shell: `Sidebar` + `TopBar` + `<main>` slot |
| `Sidebar.jsx` | Fixed left nav with 6 links (Dashboard, Today, Study Plan, SR Module, Analytics, Settings) + user email + Sign Out |
| `TopBar.jsx` | Sticky top bar; page title from route; countdown "Exam in Xd"; **broken** — uses hardcoded `EXAM_DATE` constant |

### Common

| File | Renders |
|---|---|
| `Badge.jsx` | Pill label; variants: `blue`, `green`, `amber`, `red`, `purple`, `gray`, `navy` |
| `Button.jsx` | Styled button; variants: `primary`, `secondary`, `success`, `danger`, `amber`, `ghost`; sizes: `sm`, `md`, `lg` |
| `Card.jsx` | White rounded box with border and shadow; optional `onClick` for hover effect |
| `LoadingSpinner.jsx` | Centred animated SVG ring |
| `Modal.jsx` | Fixed overlay with backdrop blur; Escape key closes; scrollable content area |
| `ProgressBar.jsx` | Thin horizontal bar; animated width transition; configurable colour and height |

### Charts

| File | Renders | Notes |
|---|---|---|
| `ReadinessGauge.jsx` | SVG half-dial, 0–99, animated needle and arc | Accepts `value` number |
| `PhaseRings.jsx` | Three SVG donut rings side by side | Accepts `{done, total}` per phase |
| `ForgettingCurves.jsx` | Custom SVG multi-line area chart with animated dots | Uses `CHART_START`/`EXAM_DATE` constants — **partially broken** |
| `SRTimeline.jsx` | Custom SVG Gantt chart | Uses `CHART_START`/`EXAM_DATE` constants — **partially broken** |
| `EMediciAreaChart.jsx` | Recharts AreaChart (done vs target cumulative) | **Broken** — imports `TASKS` constant directly |
| `RetentionMap.jsx` | CSS grid, one cell per subject | **Broken** — imports `SUBJECTS` constant; uses `milestoneTaskId` (camelCase) |
| `StudyHeatmap.jsx` | GitHub-style calendar grid, May 4 → Aug 17 | **Broken** — uses hardcoded `CHART_START`/`EXAM_DATE` constants |
| `SRDonut.jsx` | Recharts PieChart — Done / Pending / Overdue | Works correctly |

### SR

| File | Renders |
|---|---|
| `SRSubjectCard.jsx` | Collapsible card per subject; shows retention %, SR hit rows with status badges and "Mark Done" buttons |
| `SRModal.jsx` | Rating picker modal: Blackout / Hard / Medium / Easy; shows next interval; calls `completeSRHit` |

### Timer

| File | Renders |
|---|---|
| `PomodoroTimer.jsx` | SVG circular countdown: 50 min work → 10 min break → 30 min long break every 4 blocks; play/pause/reset; block counter |

---

## Hooks

| Hook | Table(s) | Key exports |
|---|---|---|
| `useAuth` | `auth.users` | `user`, `loading`, `signIn`, `signUp`, `signOut` |
| `useStudyLog` | `study_log` | `logs`, `upsertLog`, `deleteLog`, `updateBlocks`, `seedInitialData` |
| `useSRRecords` | `sr_records` | `srRecords`, `createSRRecord`, `completeSRHit`, `deleteSRRecord`, `seedInitialSRData` |
| `useUserSettings` | `user_settings` | `settings`, `updateSettings`; falls back to `DEFAULT_SETTINGS` if table missing |
| `useSubjects` | `subjects` + `tasks` | `subjects`, `addSubject` (auto-creates tasks), `updateSubject`, `deleteSubject`, `reorderSubject` |
| `useTasks` | `tasks` | `tasks`, `addTask`, `updateTask`, `deleteTask`, `reorderTask`, `getTasksBySubject`, `getTasksByPhase` |
| `usePhases` | `phases` | `phases`, `addPhase`, `updatePhase`, `deletePhase`, `reorderPhase` |
| `useScheduleTemplates` | `schedule_templates` + `schedule_template_assignments` | `templates`, `assignments`, `getTodayTemplate()`, `getTodayBlocks()`, `createTemplate`, `updateTemplate`, `deleteTemplate`, `assignTemplate` |
| `useQuestionLogs` | `question_logs` | `questionLogs`, `totalQuestions`, `totalCorrect`, `overallAccuracy`, `todayTotal`, `addQuestionLog`, `updateQuestionLog`, `deleteQuestionLog`, `getAccuracyBySubject` |
| `useMistakeLogs` | `mistake_logs` | `mistakes`, `addMistake`, `updateMistake`, `deleteMistake`, `getByType`, `getBySubject` |
| `useMockExams` | `mock_exams` + `mock_exam_breakdown` | `mockExams`, `latestMock`, `avgPercentage`, `addMockExam`, `updateMockExam`, `deleteMockExam` |

---

## Library Files (`src/lib/`)

### `studyUtils.js`
Pure functions — no React, no Supabase. All accept data as arguments (no constants imported).

| Function | Purpose |
|---|---|
| `getNextTask(logs, tasks)` | Returns the first incomplete task object sorted by `sort_order` |
| `getNextTaskNum(logs, tasks)` | Returns sort_order of next task; legacy integer fallback |
| `getDeficit(logs, tasks)` | Total target questions minus total done, clamped to ≥0 |
| `getTotalEMedici(logs)` | Sum of `e_medici` across all logs |
| `getStreak(logs)` | Consecutive complete days ending today |
| `getPhaseProgress(logs, tasks)` | `{phase1, phase2, phase3}` each `{done, total}` |
| `getProjectedDates(logs, tasks, userSettings)` | Map of `taskId → projected date string`, accounts for `rest_days_per_month` |
| `calcRetention(lastReviewDate, stability)` | Ebbinghaus formula: `R = 100 * e^(-t / (stability * 14))` |
| `getStability(srRecord)` | Returns 1 / 2 / 3.5 / 6 based on SR hits completed |
| `getSRDue(srRecords, userSettings)` | Returns array of due/overdue SR items with `grace_period_days` window |
| `completesSRHit(srRecord, hit, rating, userSettings)` | Computes update payload for completing an SR hit; applies multipliers |
| `getReadiness(logs, srRecords, tasks, questionLogs, mockExams)` | Returns `{score, taskScore, srScore, questionScore, mockScore, explanation}` — weights 35/25/25/15 |
| `getDailyRecommendation({logs, tasks, srRecords, userSettings, questionLogs, mistakeLogs})` | Returns `{mainTask, srDue, questionTarget, deficit, todayQDone, warnings, message, srLabel}` |
| `getBlueprintBalance(subjects, tasks, logs, questionLogs)` | Per-category task completion % and question accuracy |

### `dateUtils.js`
| Function | Purpose |
|---|---|
| `formatDate(date)` | → `yyyy-MM-dd` |
| `formatDisplay(date)` | → `Monday, 12 May 2026` |
| `formatShort(date)` | → `12 May` |
| `today()` | Current date as `yyyy-MM-dd` string |
| `daysUntilExam(examDate)` | Days from now to given date string |
| `isCDPathDay(date)` | Returns true for Monday or Wednesday (used for legacy schedule logic) |
| `addDaysToDate(dateStr, n)` | Adds n days to a date string |

### `constants.js`
Legacy static data — kept for backward compatibility with chart components that have not been migrated.

- `EXAM_DATE = '2026-08-17'`
- `CHART_START = '2026-05-04'`
- `TASKS` — array of 77 task objects (`id`, `phase`, `title`, `subject`, `eQty`, `isMilestone`)
- `SUBJECTS` — array of 18 subject objects (`name`, `milestoneTaskId`, `tier`, etc.)
- `SR_INTERVALS` — `{sr1: 7, sr2: 21, sr3: 45}`
- `CD_PATH_BLOCKS` / `GYM_BLOCKS` — legacy schedule block arrays

### `defaultSeedData.js`
Static default values used only at first-login seed time. Not used by live screens.

- `DEFAULT_SETTINGS` — matches `user_settings` defaults
- `DEFAULT_PHASES` — 3 phases
- `DEFAULT_SUBJECTS` — 18 subjects with blueprint_category, tier, sr_hits, class_count
- `DEFAULT_TASKS` — 77 tasks matching the original study plan
- `DEFAULT_SCHEDULE_TEMPLATES` — CD Path Day + Gym Day templates with block arrays
- `DEFAULT_SCHEDULE_ASSIGNMENTS` — Mon/Wed=CD Path, Thu–Sun=Gym, Tue=Gym

### `seedUserData.js`
`ensureUserSetup(userId)` — idempotent first-login seeder. Checks each table for existing rows before inserting. Covers: settings, phases, subjects, tasks (batched 20 at a time), schedule templates, assignments, initial study_log rows, initial SR record. **Note: this function is defined but not yet called from `App.jsx`** — the app currently uses the older `seedInitialData()` / `seedInitialSRData()` functions from the hooks instead.

### `supabase.js`
Exports a single Supabase client initialised from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables.

---

## Features: Built and Working

- **Authentication** — email/password sign-in and sign-up via Supabase Auth; session persistence; sign-out
- **Study log** — log daily status (complete/partial/missed/rest), question bank count, partial percentage; upsert by date; clear entry; persist study blocks
- **Study block tracker** — checkbox list on Today screen; each block has a label, time, and note; blocks saved to `study_log.blocks`; add custom blocks
- **Pomodoro timer** — 50/10/30 min cycle; play/pause/reset; block counter; no persistence (resets on navigation)
- **Spaced repetition** — SR1/SR2/SR3 per subject; Blackout/Hard/Medium/Easy rating; next due date auto-calculated from `user_settings` multipliers; overdue detection with `grace_period_days`
- **Task sequence** — `getNextTask` determines the current task from `sort_order`; backward compatible with legacy `task_num` integer
- **Readiness score** — composite 0–99 score: task coverage (35), SR compliance (25), question accuracy (25), latest mock (15); includes per-component breakdown
- **Daily recommendation** — message, SR due count, question target (adjusted for deficit), warnings
- **Phase progress** — task count per phase with progress bars and SVG rings
- **Forgetting curves** — custom SVG chart with Ebbinghaus decay and sawtooth review jumps
- **SR compliance donut** — Recharts pie: done / pending / overdue
- **SR Gantt timeline** — custom SVG with colour-coded dots per subject per SR hit
- **Study activity heatmap** — GitHub-style calendar grid (hardcoded date range)
- **Blueprint balance chart** — Recharts bar chart by blueprint category (completion % + accuracy %)
- **Mock exam trend** — Recharts line chart of mock scores
- **Mistake analysis chart** — Recharts horizontal bar chart by mistake type
- **Settings — Exam Setup** — edit exam name, date, question bank name, rest days, daily target; persisted to `user_settings`
- **Settings — Subjects** — full CRUD; adding a subject auto-creates class tasks + milestone task; delete cascades SR records and tasks
- **Settings — Tasks** — filterable/searchable task table; inline edit; add/delete
- **Settings — SR Settings** — configure all SR intervals and tier hit counts with live interval preview
- **Settings — Schedule** — day-of-week template assignments; template CRUD with block editor
- **Settings — Phases** — phase CRUD with task count display
- **Settings — Export** — full JSON export of all user data
- **Dynamic schedule blocks** — Today screen pulls blocks from the schedule template assigned to today's day of week
- **Question log quick-add** — optional section in Today's log modal; saves a `question_logs` row
- **Streak tracking** — consecutive complete days
- **Deficit tracking** — target questions (from task `emedici_qty`) minus done
- **Projected task dates** — accounts for `rest_days_per_month`
- **First-login seed** — `seedInitialData()` and `seedInitialSRData()` insert starter rows if the tables are empty

---

## Features: Built but Broken

### `EMediciAreaChart.jsx`
**Bug:** Imports `TASKS` constant directly (`import { TASKS } from '../../lib/constants'`). Uses `task.eQty` (camelCase) instead of `task.emedici_qty` (snake_case from DB). Will always show 0 as the target line for any user who has data in the `tasks` table rather than from the constant.  
**Fix needed:** Accept `tasks` as a prop and look up by `task_id` or `task_num`.

### `RetentionMap.jsx`
**Bug:** Imports `SUBJECTS` constant and uses `subject.milestoneTaskId` (camelCase). Dynamic subjects from the DB use `milestone_task_id` (snake_case). Result: every cell shows "Not studied" regardless of actual progress.  
**Fix needed:** Accept `subjects` as a prop; use `subject.milestone_task_id`.

### `ForgettingCurves.jsx` and `SRTimeline.jsx`
**Bug:** Import `CHART_START` and `EXAM_DATE` from constants (`'2026-05-04'`, `'2026-08-17'`). These are hardcoded and will not update if the user changes their exam date in Settings.  
**Fix needed:** Accept `settings` prop and derive `chartStart = settings.study_start_date`, `examDate = settings.exam_date`.

### `StudyHeatmap.jsx`
**Bug:** Same as above — uses `CHART_START` and `EXAM_DATE` constants for the calendar range.  
**Fix needed:** Accept `settings` prop.

### `TopBar.jsx`
**Bug:** Imports `EXAM_DATE` constant and calls `daysUntilExam('2026-08-17')`. Does not reflect a user-configured exam date.  
**Fix needed:** Receive `settings` prop from `Layout` → `App.jsx`, or read from context.

### `Settings — Import tab`
**Status:** Placeholder UI only. The file input is rendered but no import logic is implemented. Clicking import does nothing.

### `ensureUserSetup` not wired
**Status:** `src/lib/seedUserData.js` contains a complete idempotent seeder (`ensureUserSetup`) that populates all 10 tables on first login. It is **not called anywhere** — `App.jsx` still uses the older `seedInitialData()` / `seedInitialSRData()` from the hooks, which only seed `study_log` and `sr_records` with 2–3 rows. The full subject/task/settings/schedule seed does not run automatically.

### `useUserSettings.updateSettings`
**Bug:** Calls `supabase.from('user_settings').update(...)` but if the row doesn't exist yet (new user, table exists but no row inserted), the update silently no-ops. There is no upsert fallback.  
**Fix needed:** Use `upsert` with `onConflict: 'user_id'` instead of `update`.

### `useSRRecords.completeSRHit`
**Bug:** Calls `completesSRHit(record, hit, rating)` without passing `userSettings`. The function signature is `completesSRHit(srRecord, hit, rating, userSettings)` — when `userSettings` is undefined the multipliers default correctly (1.5 / 2.0), but SR3 will always be scheduled even for tier-2 subjects where `max_hits` should be 2.  
**Fix needed:** Pass `settings` from `useUserSettings` into `completeSRHit`.

---

## Known Bugs and Missing Features

### Known bugs
1. **Chart components import constants** — `EMediciAreaChart`, `RetentionMap`, `ForgettingCurves`, `SRTimeline`, `StudyHeatmap` all import from `src/lib/constants.js` rather than accepting dynamic props. They will display stale or incorrect data for any user who modifies their exam date or subjects via Settings.
2. **TopBar exam countdown is hardcoded** — always counts down to `2026-08-17` regardless of Settings.
3. **`updateSettings` is not an upsert** — new users whose row was never inserted will find Settings changes silently ignored.
4. **SR multipliers not passed to `completeSRHit`** — tier-2 subjects (max 2 hits) may schedule an SR3 hit incorrectly.
5. **`study_log.task_id` not written** — `useStudyLog.upsertLog` does not include `task_id` in its payload (the column exists but is never populated by the current hook code). Task completion matching falls back entirely to the legacy `task_num` integer.
6. **`subjects.milestone_task_id` never set** — when `useSubjects.addSubject` creates the milestone task, it does not write the resulting `task.id` back to `subjects.milestone_task_id`. This means SR record auto-creation in `App.jsx` will never match any subject.

### Missing features
- **Import** — the Settings Import/Export tab has no import logic; only export works
- **Question bank dedicated screen** — there is no standalone screen to browse/add/edit `question_logs`. It can only be added via the Today log modal quick-add
- **Mistake log dedicated screen** — `mistake_logs` data is only visible in the Analytics chart. No screen to browse, add, or edit individual mistake entries
- **Mock exam dedicated screen** — `mock_exams` data appears only in the Analytics trend chart. No UI to add/edit mock exam records (the `useMockExams` hook exists and is fully functional)
- **Catch-up mode** — planned feature; not started
- **Push notifications / reminders** — no implementation
- **Offline support** — no service worker or local cache
- **Multi-user / sharing** — single-user only; all RLS policies are `auth.uid() = user_id`
- **`ensureUserSetup` integration** — the comprehensive first-login seeder exists in `seedUserData.js` but is never called; new users get only 2 study_log rows and 1 SR record seeded

---

## File Structure

```
/
├── PROJECT_SUMMARY.md
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .env.local                        # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (gitignored)
├── supabase/
│   └── customization_migration.sql   # Customisation tables only (base tables missing — use full script)
└── src/
    ├── main.jsx                      # ReactDOM.createRoot, BrowserRouter
    ├── App.jsx                       # Route tree, all hook wiring, data flow to screens
    ├── index.css / App.css / styles/globals.css
    ├── lib/
    │   ├── supabase.js               # Supabase client singleton
    │   ├── constants.js              # Legacy static data (TASKS, SUBJECTS, EXAM_DATE, etc.)
    │   ├── defaultSeedData.js        # Seed defaults (not imported by screens)
    │   ├── seedUserData.js           # ensureUserSetup() — not yet called from App.jsx
    │   ├── studyUtils.js             # All pure study calculation functions
    │   └── dateUtils.js             # Date formatting helpers
    ├── hooks/
    │   ├── useAuth.js
    │   ├── useStudyLog.js
    │   ├── useSRRecords.js
    │   ├── useUserSettings.js
    │   ├── useSubjects.js
    │   ├── useTasks.js
    │   ├── usePhases.js
    │   ├── useScheduleTemplates.js
    │   ├── useQuestionLogs.js
    │   ├── useMistakeLogs.js
    │   └── useMockExams.js
    ├── screens/
    │   ├── Auth.jsx
    │   ├── Dashboard.jsx
    │   ├── Today.jsx
    │   ├── Plan.jsx
    │   ├── SRModule.jsx
    │   ├── Analytics.jsx
    │   └── Settings.jsx
    └── components/
        ├── Layout/
        │   ├── Layout.jsx
        │   ├── Sidebar.jsx
        │   └── TopBar.jsx
        ├── Common/
        │   ├── Badge.jsx
        │   ├── Button.jsx
        │   ├── Card.jsx
        │   ├── LoadingSpinner.jsx
        │   ├── Modal.jsx
        │   └── ProgressBar.jsx
        ├── Charts/
        │   ├── ReadinessGauge.jsx
        │   ├── PhaseRings.jsx
        │   ├── ForgettingCurves.jsx  ⚠ uses constants
        │   ├── SRTimeline.jsx        ⚠ uses constants
        │   ├── EMediciAreaChart.jsx  ⚠ uses constants
        │   ├── RetentionMap.jsx      ⚠ uses constants
        │   ├── StudyHeatmap.jsx      ⚠ uses constants
        │   └── SRDonut.jsx
        ├── SR/
        │   ├── SRSubjectCard.jsx
        │   └── SRModal.jsx
        └── Timer/
            └── PomodoroTimer.jsx
```

---

## Data Flow

```
Supabase Auth
    │
    ▼
useAuth (user, loading)
    │
    ▼
App.jsx — calls all 11 hooks, passes data as props
    │
    ├── useStudyLog       → logs[]
    ├── useSRRecords      → srRecords[]
    ├── useUserSettings   → settings{}
    ├── useSubjects       → subjects[]
    ├── useTasks          → tasks[]
    ├── useScheduleTemplates → todayBlocks[], scheduleTemplateName
    ├── useQuestionLogs   → questionLogs[]
    ├── useMistakeLogs    → mistakes[]
    └── useMockExams      → mockExams[]
         │
         ▼
    Screens receive data as props
    Settings.jsx calls its own hooks internally (independent)
```

All hooks follow the same pattern:
1. `useCallback`-wrapped fetch function with `user` as dependency
2. `useEffect` calls fetch on mount and user change
3. Mutation functions call Supabase then re-fetch
4. Loading state returned alongside data
