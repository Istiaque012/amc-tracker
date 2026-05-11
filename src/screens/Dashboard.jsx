import { useNavigate } from 'react-router-dom';
import { Flame, BookOpen, CheckCircle, Zap, TrendingDown, Clock } from 'lucide-react';
import Card from '../components/Common/Card';
import Badge from '../components/Common/Badge';
import Button from '../components/Common/Button';
import ProgressBar from '../components/Common/ProgressBar';
import ReadinessGauge from '../components/Charts/ReadinessGauge';
import PhaseRings from '../components/Charts/PhaseRings';
import { formatDisplay, today, daysUntilExam } from '../lib/dateUtils';
import { getNextTaskNum, getDeficit, getStreak, getTotalEMedici, getReadiness, getPhaseProgress, getSRDue } from '../lib/studyUtils';
import { TASKS, SUBJECTS, EXAM_DATE } from '../lib/constants';

function MetricCard({ label, value, sub, color = '#3B82F6', icon: Icon, bg }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-sans text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-1">{label}</p>
          <p className="font-mono text-2xl font-bold" style={{ color }}>{value}</p>
          {sub && <p className="font-sans text-xs text-[#94A3B8] mt-0.5">{sub}</p>}
        </div>
        {Icon && (
          <div className="p-2 rounded-[10px]" style={{ backgroundColor: bg || `${color}15` }}>
            <Icon size={18} style={{ color }} />
          </div>
        )}
      </div>
    </Card>
  );
}

export default function Dashboard({ logs, srRecords }) {
  const navigate = useNavigate();
  const nextTask = getNextTaskNum(logs);
  const todayTask = TASKS.find(t => t.id === nextTask);
  const deficit = getDeficit(logs);
  const streak = getStreak(logs);
  const totalE = getTotalEMedici(logs);
  const readiness = getReadiness(logs, srRecords);
  const phases = getPhaseProgress(logs);
  const srDue = getSRDue(srRecords);
  const completedTasks = logs.filter(l => l.status === 'complete').length;
  const completedSubjects = SUBJECTS.filter(s =>
    logs.some(l => l.status === 'complete' && l.task_num === s.milestoneTaskId)
  ).length;
  const daysLeft = daysUntilExam(EXAM_DATE);

  const todayStr = today();
  const todayLog = logs.find(l => l.date === todayStr);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-4xl text-[#0F172A] mb-1">{formatDisplay(new Date())}</h1>
        <p className="font-sans text-[#64748B]">AMC MCQ Exam · August 17, 2026</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column */}
        <div className="col-span-2 flex flex-col gap-6">
          {/* Today's task */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#64748B]">Today's Task</span>
              {todayTask && <Badge variant={todayTask.phase === 1 ? 'blue' : todayTask.phase === 2 ? 'purple' : 'green'}>Phase {todayTask.phase}</Badge>}
            </div>
            {todayTask ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-xs text-[#94A3B8]">#{todayTask.id}</span>
                  {todayTask.isMilestone && <Badge variant="amber">Milestone</Badge>}
                </div>
                <p className="font-serif text-xl text-[#0F172A] mb-1">{todayTask.title}</p>
                <p className="font-sans text-sm text-[#64748B]">{todayTask.subject} · Target {todayTask.eQty} eMedici</p>
                <div className="mt-4">
                  {todayLog ? (
                    <div className="flex items-center gap-3">
                      <Badge variant={todayLog.status === 'complete' ? 'green' : todayLog.status === 'partial' ? 'amber' : 'red'}>
                        {todayLog.status}
                      </Badge>
                      <Button variant="secondary" size="sm" onClick={() => navigate('/today')}>Edit Entry</Button>
                    </div>
                  ) : (
                    <Button onClick={() => navigate('/today')}>Log Today</Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="font-sans text-[#64748B]">All 77 tasks complete!</p>
            )}
          </Card>

          {/* SR alerts */}
          {srDue.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-[#64748B]">Spaced Repetition Due</h3>
              {srDue.slice(0, 4).map(sr => (
                <div key={`${sr.subject_name}-${sr.hit}`}
                  className={`flex items-center justify-between px-4 py-3 rounded-[10px] border ${
                    sr.overdue ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-[#FFFBEB] border-[#FDE68A]'
                  }`}>
                  <div className="flex items-center gap-3">
                    <Badge variant={sr.overdue ? 'red' : 'amber'}>{sr.label}</Badge>
                    <span className="font-sans text-sm font-semibold text-[#0F172A]">{sr.subject_name}</span>
                    {sr.overdue && <span className="font-sans text-xs text-[#EF4444]">Overdue</span>}
                  </div>
                  <Button size="sm" variant={sr.overdue ? 'danger' : 'amber'} onClick={() => navigate('/sr')}>
                    Review →
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <MetricCard label="Tasks Done" value={`${completedTasks}/77`} color="#3B82F6" icon={BookOpen} bg="#EFF6FF" />
            <MetricCard label="Subjects" value={`${completedSubjects}/18`} color="#10B981" icon={CheckCircle} bg="#ECFDF5" />
            <MetricCard
              label="Streak"
              value={streak === 0 ? '0' : `${streak} 🔥`}
              color={streak > 0 ? '#F59E0B' : '#94A3B8'}
              icon={Flame} bg="#FFFBEB"
              sub={streak > 0 ? 'days' : 'No active streak'}
            />
            <MetricCard label="eMedici Done" value={totalE} color="#8B5CF6" icon={Zap} bg="#F5F3FF" sub="questions total" />
            <MetricCard
              label="eMedici Deficit"
              value={deficit}
              color={deficit > 20 ? '#EF4444' : deficit > 0 ? '#F59E0B' : '#10B981'}
              icon={TrendingDown}
              bg={deficit > 20 ? '#FEF2F2' : deficit > 0 ? '#FFFBEB' : '#ECFDF5'}
              sub={deficit === 0 ? 'On track!' : 'questions behind'}
            />
            <MetricCard
              label="Days to Exam"
              value={daysLeft}
              color={daysLeft < 30 ? '#EF4444' : '#0F2744'}
              icon={Clock}
              bg={daysLeft < 30 ? '#FEF2F2' : '#EFF6FF'}
              sub="Aug 17, 2026"
            />
          </div>

          {/* Phase progress bars */}
          <Card className="p-5">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-[#64748B] mb-4">Phase Progress</h3>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Phase 1 — Foundation', data: phases.phase1, color: '#3B82F6' },
                { label: 'Phase 2 — Recall', data: phases.phase2, color: '#8B5CF6' },
                { label: 'Phase 3 — Final', data: phases.phase3, color: '#10B981' },
              ].map(p => (
                <div key={p.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="font-sans text-sm text-[#334155]">{p.label}</span>
                    <span className="font-mono text-sm text-[#64748B]">{p.data.done}/{p.data.total}</span>
                  </div>
                  <ProgressBar value={p.data.done} max={p.data.total} color={p.color} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          <Card className="p-5">
            <ReadinessGauge value={readiness} />
          </Card>

          <Card className="p-5">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">Phase Rings</h3>
            <PhaseRings phase1={phases.phase1} phase2={phases.phase2} phase3={phases.phase3} />
          </Card>

          <Card className="p-5">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">Exam Countdown</h3>
            <div className="text-center">
              <div className="font-mono text-5xl font-bold text-[#0F2744]">{daysLeft}</div>
              <div className="font-sans text-sm text-[#64748B] mt-1">days remaining</div>
              <div className="font-sans text-xs text-[#94A3B8] mt-2">August 17, 2026</div>
              <ProgressBar
                value={77 - daysLeft}
                max={77 + (Math.max(0, daysLeft - 77))}
                color={daysLeft < 30 ? '#EF4444' : '#0F2744'}
                className="mt-3"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
