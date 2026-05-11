import Card from '../components/Common/Card';
import ForgettingCurves from '../components/Charts/ForgettingCurves';
import SRTimeline from '../components/Charts/SRTimeline';
import EMediciAreaChart from '../components/Charts/EMediciAreaChart';
import RetentionMap from '../components/Charts/RetentionMap';
import StudyHeatmap from '../components/Charts/StudyHeatmap';
import SRDonut from '../components/Charts/SRDonut';
import { getBlueprintBalance } from '../lib/studyUtils';
import { MISTAKE_TYPES } from '../hooks/useMistakeLogs';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line,
} from 'recharts';

function BlueprintBalanceChart({ subjects, tasks, logs, questionLogs }) {
  const data = getBlueprintBalance(subjects, tasks, logs, questionLogs);
  if (data.length === 0) return (
    <p className="font-sans text-sm text-[#94A3B8] text-center py-8">No data yet</p>
  );
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis
          dataKey="category"
          tick={{ fontFamily: 'sans-serif', fontSize: 11, fill: '#64748B' }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontFamily: 'monospace', fontSize: 11, fill: '#94A3B8' }} />
        <Tooltip
          contentStyle={{ fontFamily: 'sans-serif', fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
          formatter={(v, name) => [name === 'completionPct' ? `${v}%` : name === 'accuracy' ? (v !== null ? `${v}%` : '—') : v, name]}
        />
        <Bar dataKey="completionPct" name="Task completion %" fill="#3B82F6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="accuracy" name="Question accuracy %" fill="#10B981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function MockExamTrend({ mockExams }) {
  if (!mockExams || mockExams.length === 0) return (
    <p className="font-sans text-sm text-[#94A3B8] text-center py-8">No mock exam data yet. Add your first mock in Settings.</p>
  );
  const sorted = [...mockExams].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const data = sorted.map((m, i) => ({
    name: m.exam_name || `Mock ${i + 1}`,
    date: m.date,
    score: m.percentage || 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="name" tick={{ fontFamily: 'sans-serif', fontSize: 11, fill: '#64748B' }} />
        <YAxis domain={[0, 100]} tick={{ fontFamily: 'monospace', fontSize: 11, fill: '#94A3B8' }} tickFormatter={v => `${v}%`} />
        <Tooltip
          contentStyle={{ fontFamily: 'sans-serif', fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
          formatter={v => [`${v}%`, 'Score']}
        />
        <Line type="monotone" dataKey="score" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: '#8B5CF6', r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function MistakeBreakdown({ mistakes }) {
  if (!mistakes || mistakes.length === 0) return (
    <p className="font-sans text-sm text-[#94A3B8] text-center py-8">No mistakes logged yet.</p>
  );
  const countMap = {};
  mistakes.forEach(m => {
    const k = m.mistake_type || 'other';
    countMap[k] = (countMap[k] || 0) + 1;
  });
  const data = MISTAKE_TYPES
    .map(t => ({ name: t.label, count: countMap[t.key] || 0 }))
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
        <XAxis type="number" tick={{ fontFamily: 'monospace', fontSize: 11, fill: '#94A3B8' }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={140} tick={{ fontFamily: 'sans-serif', fontSize: 11, fill: '#64748B' }} />
        <Tooltip
          contentStyle={{ fontFamily: 'sans-serif', fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
          formatter={v => [v, 'Count']}
        />
        <Bar dataKey="count" fill="#EF4444" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function Analytics({ logs, srRecords, subjects = [], tasks = [], questionLogs = [], mockExams = [], mistakes = [] }) {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-[#0F172A] mb-1">Analytics</h1>
        <p className="font-sans text-[#64748B] text-sm">Visual progress tracking across all dimensions</p>
      </div>

      <div className="flex flex-col gap-8">
        {/* 1. Forgetting Curves */}
        <Card className="p-6">
          <h2 className="font-serif text-xl text-[#0F172A] mb-1">Ebbinghaus Forgetting Curves</h2>
          <p className="font-sans text-xs text-[#94A3B8] mb-4">Retention decay per subject with SR review sawtooth jumps</p>
          <ForgettingCurves srRecords={srRecords} logs={logs} />
        </Card>

        {/* 2. SR Timeline */}
        <Card className="p-6">
          <h2 className="font-serif text-xl text-[#0F172A] mb-1">SR Review Timeline</h2>
          <p className="font-sans text-xs text-[#94A3B8] mb-4">Gantt view of all scheduled spaced repetition events</p>
          <div className="overflow-x-auto">
            <SRTimeline srRecords={srRecords} />
          </div>
        </Card>

        {/* 3. eMedici Area Chart */}
        <Card className="p-6">
          <h2 className="font-serif text-xl text-[#0F172A] mb-1">Question Bank Progress</h2>
          <p className="font-sans text-xs text-[#94A3B8] mb-4">Cumulative questions done vs target</p>
          <EMediciAreaChart logs={logs} />
        </Card>

        {/* 4. Blueprint Balance */}
        {subjects.length > 0 && (
          <Card className="p-6">
            <h2 className="font-serif text-xl text-[#0F172A] mb-1">Blueprint Balance</h2>
            <p className="font-sans text-xs text-[#94A3B8] mb-4">Task completion and question accuracy by blueprint category</p>
            <BlueprintBalanceChart subjects={subjects} tasks={tasks} logs={logs} questionLogs={questionLogs} />
          </Card>
        )}

        {/* 5. Mock Exam Trend */}
        <Card className="p-6">
          <h2 className="font-serif text-xl text-[#0F172A] mb-1">Mock Exam Trend</h2>
          <p className="font-sans text-xs text-[#94A3B8] mb-4">Score progression across mock sittings</p>
          <MockExamTrend mockExams={mockExams} />
        </Card>

        {/* 6. Mistake Breakdown */}
        <Card className="p-6">
          <h2 className="font-serif text-xl text-[#0F172A] mb-1">Mistake Analysis</h2>
          <p className="font-sans text-xs text-[#94A3B8] mb-4">Frequency of each mistake type in your log</p>
          <MistakeBreakdown mistakes={mistakes} />
        </Card>

        {/* 7. Retention Heatmap */}
        <Card className="p-6">
          <h2 className="font-serif text-xl text-[#0F172A] mb-1">Subject Retention Map</h2>
          <p className="font-sans text-xs text-[#94A3B8] mb-4">Current estimated retention per subject</p>
          <RetentionMap srRecords={srRecords} logs={logs} />
        </Card>

        {/* 8. Study Activity Heatmap */}
        <Card className="p-6">
          <h2 className="font-serif text-xl text-[#0F172A] mb-1">Study Activity Heatmap</h2>
          <p className="font-sans text-xs text-[#94A3B8] mb-4">GitHub-style calendar from study start to exam day</p>
          <StudyHeatmap logs={logs} />
        </Card>

        {/* 9. SR Donut */}
        <Card className="p-6">
          <h2 className="font-serif text-xl text-[#0F172A] mb-1">SR Compliance</h2>
          <p className="font-sans text-xs text-[#94A3B8] mb-2">Done vs pending vs overdue reviews</p>
          <div style={{ maxWidth: 400 }}>
            <SRDonut srRecords={srRecords} />
          </div>
        </Card>
      </div>
    </div>
  );
}
