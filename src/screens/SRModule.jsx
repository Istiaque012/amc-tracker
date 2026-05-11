import { useState } from 'react';
import Card from '../components/Common/Card';
import SRSubjectCard from '../components/SR/SRSubjectCard';
import SRModal from '../components/SR/SRModal';
import SRDonut from '../components/Charts/SRDonut';
import { getSRDue } from '../lib/studyUtils';
import { formatShort } from '../lib/dateUtils';
import { format, addDays, parseISO } from 'date-fns';

export default function SRModule({ logs, srRecords, completeSRHit, createSRRecord, subjects = [], settings = {} }) {
  const [srModal, setSrModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const completedTaskIds = new Set(
    logs.filter(l => l.status === 'complete').map(l => l.task_id || String(l.task_num))
  );
  const srDue = getSRDue(srRecords, settings);
  const sr1Interval = settings.sr1_interval || 7;

  const completedSubjects = subjects.filter(s => {
    const mid = s.milestone_task_id;
    return mid && (completedTaskIds.has(mid) || completedTaskIds.has(String(mid)));
  });

  const enrichedRecords = completedSubjects.map(subject => {
    const existing = srRecords.find(r => r.subject_name === subject.name);
    if (existing) return existing;
    // Subject completed but no SR record yet — synthesize
    const mid = subject.milestone_task_id;
    const log = logs.find(l =>
      (l.task_id === mid || String(l.task_num) === String(mid)) && l.status === 'complete'
    );
    if (!log) return null;
    return {
      subject_name: subject.name,
      completed_date: log.date,
      sr1_due: format(addDays(parseISO(log.date), sr1Interval), 'yyyy-MM-dd'),
      sr1_done: false,
      sr2_due: null, sr2_done: false,
      sr3_due: null, sr3_done: false,
    };
  }).filter(Boolean);

  // Upcoming SRs in next 7 days
  const todayStr = new Date().toISOString().slice(0, 10);
  const in7 = format(addDays(new Date(), 7), 'yyyy-MM-dd');
  const upcoming = enrichedRecords.flatMap(rec =>
    ['sr1', 'sr2', 'sr3'].flatMap(hit => {
      const due = rec[`${hit}_due`];
      const done = rec[`${hit}_done`];
      if (!due || done || due <= todayStr || due > in7) return [];
      return [{ subject: rec.subject_name, hit, due }];
    })
  ).sort((a, b) => a.due.localeCompare(b.due));

  async function handleSR(rating) {
    if (!srModal) return;
    setSaving(true);
    const existing = srRecords.find(r => r.subject_name === srModal.subjectName);
    if (!existing) {
      const subject = subjects.find(s => s.name === srModal.subjectName);
      const mid = subject?.milestone_task_id;
      const log = logs.find(l =>
        (l.task_id === mid || String(l.task_num) === String(mid)) && l.status === 'complete'
      );
      if (log) {
        await createSRRecord({
          subject_name: srModal.subjectName,
          completed_date: log.date,
          sr1_due: format(addDays(parseISO(log.date), sr1Interval), 'yyyy-MM-dd'),
        });
      }
    }
    await completeSRHit(srModal.subjectName, srModal.hit, rating);
    setSaving(false);
    setSrModal(null);
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-[#0F172A] mb-1">Spaced Repetition</h1>
        <p className="font-sans text-[#64748B] text-sm">
          {completedSubjects.length} subjects completed · {srDue.length} due today
        </p>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Left */}
        <div className="flex flex-col gap-4">
          {/* Protocol card */}
          <Card className="p-4 bg-[#EFF6FF] border-[#BFDBFE]">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-[#1D4ED8] mb-3">SR Protocol</h3>
            <div className="flex flex-col gap-1.5">
              {[
                [`SR1 · Day ${sr1Interval}`, '15 min master sheet scan → 30 questions → analysis'],
                [`SR2 · Day ${Math.round(sr1Interval * (settings.sr2_multiplier || 1.5) * 2)}`, '30 questions cold → wrong sections only'],
                [`SR3 · Day ${Math.round(sr1Interval * (settings.sr2_multiplier || 1.5) * 2 * (settings.sr3_multiplier || 2.0))}`, 'Starred items → 20 targeted questions'],
              ].map(([label, desc]) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="font-mono text-xs font-bold text-[#1D4ED8] mt-0.5 w-24 flex-shrink-0">{label}</span>
                  <span className="font-sans text-sm text-[#334155]">{desc}</span>
                </div>
              ))}
            </div>
          </Card>

          {enrichedRecords.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[#94A3B8] font-sans text-sm">
              Complete your first milestone task to start SR tracking
            </div>
          ) : (
            enrichedRecords.map(rec => (
              <SRSubjectCard
                key={rec.subject_name}
                rec={rec}
                onMarkDue={(subject, hit, label) => setSrModal({ subjectName: subject, hit, hitLabel: label })}
              />
            ))
          )}
        </div>

        {/* Right — sticky */}
        <div className="flex flex-col gap-4 sticky top-6 self-start">
          <Card className="p-4">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-2">SR Compliance</h3>
            <SRDonut srRecords={enrichedRecords} />
          </Card>

          {/* Today's queue */}
          {srDue.length > 0 && (
            <Card className="p-4">
              <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-3">Due Today</h3>
              <div className="flex flex-col gap-2">
                {srDue.map(sr => (
                  <div
                    key={`${sr.subject_name}-${sr.hit}`}
                    className="flex items-center justify-between py-1 border-b border-[#F1F5F9] last:border-0"
                  >
                    <span className="font-sans text-sm text-[#334155]">{sr.subject_name}</span>
                    <button
                      onClick={() => setSrModal({ subjectName: sr.subject_name, hit: sr.hit, hitLabel: sr.label })}
                      className={`font-mono text-xs font-bold px-2 py-1 rounded-[6px] cursor-pointer ${
                        sr.overdue ? 'bg-[#FEF2F2] text-[#EF4444]' : 'bg-[#FFFBEB] text-[#F59E0B]'
                      }`}
                    >
                      {sr.label}
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <Card className="p-4">
              <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-3">Next 7 Days</h3>
              <div className="flex flex-col gap-2">
                {upcoming.map(u => (
                  <div key={`${u.subject}-${u.hit}`} className="flex items-center justify-between py-1 border-b border-[#F1F5F9] last:border-0">
                    <span className="font-sans text-sm text-[#334155]">{u.subject}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#94A3B8]">{formatShort(u.due)}</span>
                      <span className="font-mono text-xs text-[#64748B]">{u.hit.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <SRModal
        open={!!srModal}
        onClose={() => setSrModal(null)}
        subjectName={srModal?.subjectName || ''}
        hitLabel={srModal?.hitLabel || ''}
        onSave={handleSR}
        loading={saving}
      />
    </div>
  );
}
