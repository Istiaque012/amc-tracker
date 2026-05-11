import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Layout from './components/Layout/Layout';
import Dashboard from './screens/Dashboard';
import Today from './screens/Today';
import Plan from './screens/Plan';
import SRModule from './screens/SRModule';
import Analytics from './screens/Analytics';
import Auth from './screens/Auth';
import LoadingSpinner from './components/Common/LoadingSpinner';
import { useAuth } from './hooks/useAuth';
import { useStudyLog } from './hooks/useStudyLog';
import { useSRRecords } from './hooks/useSRRecords';
import { SUBJECTS } from './lib/constants';
import { format, addDays, parseISO } from 'date-fns';

function AppInner() {
  const { user, loading: authLoading, signOut } = useAuth();
  const {
    logs, loading: logsLoading, upsertLog, deleteLog, updateBlocks, seedInitialData
  } = useStudyLog();
  const {
    srRecords, loading: srLoading, createSRRecord, completeSRHit, seedInitialSRData
  } = useSRRecords();

  // Seed only once when user first logs in — no loading state in deps to avoid loops
  useEffect(() => {
    if (user) {
      seedInitialData();
      seedInitialSRData();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-create SR records for milestone completions that don't have one yet.
  // Use a ref to track which subjects we've already issued a create for this session
  // so this effect doesn't re-trigger itself via srRecords changing.
  const autoCreatedRef = useRef(new Set());
  useEffect(() => {
    autoCreatedRef.current = new Set(); // reset on user change
  }, [user]);

  useEffect(() => {
    if (!user || logsLoading || srLoading) return;
    const completedTaskIds = new Set(logs.filter(l => l.status === 'complete').map(l => l.task_num));
    SUBJECTS.forEach(subject => {
      if (!completedTaskIds.has(subject.milestoneTaskId)) return;
      const hasRecord = srRecords.some(r => r.subject_name === subject.name);
      if (hasRecord || autoCreatedRef.current.has(subject.name)) return;
      const log = logs.find(l => l.task_num === subject.milestoneTaskId && l.status === 'complete');
      if (log) {
        autoCreatedRef.current.add(subject.name);
        createSRRecord({
          subject_name: subject.name,
          completed_date: log.date,
          sr1_due: format(addDays(parseISO(log.date), 7), 'yyyy-MM-dd'),
        });
      }
    });
  }, [logs, logsLoading, srLoading, user]); // srRecords intentionally omitted — ref guards duplicates

  if (authLoading) return <LoadingSpinner />;
  if (!user) return <Auth />;

  const loading = logsLoading || srLoading;

  return (
    <Layout user={user} signOut={signOut}>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <Routes>
          <Route path="/" element={<Dashboard logs={logs} srRecords={srRecords} />} />
          <Route path="/today" element={
            <Today
              logs={logs}
              srRecords={srRecords}
              upsertLog={upsertLog}
              updateBlocks={updateBlocks}
              deleteLog={deleteLog}
            />
          } />
          <Route path="/plan" element={
            <Plan logs={logs} upsertLog={upsertLog} deleteLog={deleteLog} />
          } />
          <Route path="/sr" element={
            <SRModule
              logs={logs}
              srRecords={srRecords}
              completeSRHit={completeSRHit}
              createSRRecord={createSRRecord}
            />
          } />
          <Route path="/analytics" element={<Analytics logs={logs} srRecords={srRecords} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </Layout>
  );
}

export default function App() {
  return <AppInner />;
}
