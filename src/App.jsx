import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Layout from './components/Layout/Layout';
import Dashboard from './screens/Dashboard';
import Today from './screens/Today';
import Plan from './screens/Plan';
import SRModule from './screens/SRModule';
import Analytics from './screens/Analytics';
import Settings from './screens/Settings';
import Auth from './screens/Auth';
import LoadingSpinner from './components/Common/LoadingSpinner';
import { useAuth } from './hooks/useAuth';
import { useStudyLog } from './hooks/useStudyLog';
import { useSRRecords } from './hooks/useSRRecords';
import { useUserSettings } from './hooks/useUserSettings';
import { useSubjects } from './hooks/useSubjects';
import { useTasks } from './hooks/useTasks';
import { useScheduleTemplates } from './hooks/useScheduleTemplates';
import { useQuestionLogs } from './hooks/useQuestionLogs';
import { useMistakeLogs } from './hooks/useMistakeLogs';
import { useMockExams } from './hooks/useMockExams';
import { format, addDays, parseISO } from 'date-fns';

function AppInner() {
  const { user, loading: authLoading, signOut } = useAuth();
  const {
    logs, loading: logsLoading, upsertLog, deleteLog, updateBlocks, seedInitialData,
  } = useStudyLog();
  const {
    srRecords, loading: srLoading, createSRRecord, completeSRHit, seedInitialSRData,
  } = useSRRecords();
  const { settings, loading: settingsLoading } = useUserSettings();
  const { subjects, loading: subjectsLoading } = useSubjects();
  const { tasks, loading: tasksLoading } = useTasks();
  const { getTodayTemplate, getTodayBlocks } = useScheduleTemplates();
  const { questionLogs, addQuestionLog } = useQuestionLogs();
  const { mistakes } = useMistakeLogs();
  const { mockExams } = useMockExams();

  // Seed only once when user first logs in
  useEffect(() => {
    if (user) {
      seedInitialData();
      seedInitialSRData();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-create SR records for milestone completions that don't have one yet.
  const autoCreatedRef = useRef(new Set());
  useEffect(() => {
    autoCreatedRef.current = new Set();
  }, [user]);

  useEffect(() => {
    if (!user || logsLoading || srLoading || subjectsLoading) return;
    const completedTaskIds = new Set(
      logs.filter(l => l.status === 'complete').map(l => l.task_id || String(l.task_num))
    );
    const sr1Interval = settings?.sr1_interval || 7;

    const subjectList = subjects.length > 0 ? subjects : [];
    subjectList.forEach(subject => {
      const mid = subject.milestone_task_id;
      if (!mid) return;
      if (!completedTaskIds.has(mid) && !completedTaskIds.has(String(mid))) return;
      const hasRecord = srRecords.some(r => r.subject_name === subject.name);
      if (hasRecord || autoCreatedRef.current.has(subject.name)) return;
      const log = logs.find(l =>
        (l.task_id === mid || String(l.task_num) === String(mid)) && l.status === 'complete'
      );
      if (log) {
        autoCreatedRef.current.add(subject.name);
        createSRRecord({
          subject_name: subject.name,
          completed_date: log.date,
          sr1_due: format(addDays(parseISO(log.date), sr1Interval), 'yyyy-MM-dd'),
        });
      }
    });
  }, [logs, logsLoading, srLoading, subjectsLoading, user]); // srRecords intentionally omitted

  if (authLoading) return <LoadingSpinner />;
  if (!user) return <Auth />;

  const loading = logsLoading || srLoading || settingsLoading || subjectsLoading || tasksLoading;
  const todayBlocks = getTodayBlocks();
  const todayTemplate = getTodayTemplate();

  return (
    <Layout user={user} signOut={signOut}>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <Routes>
          <Route path="/" element={
            <Dashboard
              logs={logs}
              srRecords={srRecords}
              tasks={tasks}
              subjects={subjects}
              settings={settings}
              questionLogs={questionLogs}
              mockExams={mockExams}
            />
          } />
          <Route path="/today" element={
            <Today
              logs={logs}
              srRecords={srRecords}
              upsertLog={upsertLog}
              updateBlocks={updateBlocks}
              deleteLog={deleteLog}
              tasks={tasks}
              todayBlocks={todayBlocks}
              scheduleTemplateName={todayTemplate?.name || 'Today'}
              settings={settings}
              questionLogs={questionLogs}
              addQuestionLog={addQuestionLog}
              subjects={subjects}
            />
          } />
          <Route path="/plan" element={
            <Plan
              logs={logs}
              upsertLog={upsertLog}
              deleteLog={deleteLog}
              tasks={tasks}
              settings={settings}
            />
          } />
          <Route path="/sr" element={
            <SRModule
              logs={logs}
              srRecords={srRecords}
              completeSRHit={completeSRHit}
              createSRRecord={createSRRecord}
              subjects={subjects}
              settings={settings}
            />
          } />
          <Route path="/analytics" element={
            <Analytics
              logs={logs}
              srRecords={srRecords}
              subjects={subjects}
              tasks={tasks}
              questionLogs={questionLogs}
              mockExams={mockExams}
              mistakes={mistakes}
            />
          } />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </Layout>
  );
}

export default function App() {
  return <AppInner />;
}
