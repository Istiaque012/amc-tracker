import { useState } from 'react';
import Card from '../components/Common/Card';
import SRSubjectCard from '../components/SR/SRSubjectCard';
import SRModal from '../components/SR/SRModal';
import SRDonut from '../components/Charts/SRDonut';
import { getSRDue } from '../lib/studyUtils';
import { formatShort, today } from '../lib/dateUtils';
import { format, addDays } from 'date-fns';
import { SUBJECTS as FALLBACK_SUBJECTS } from '../lib/constants';

function RetentionHeatmap({ srRecords }) {
  const todayStr = today();

  function getRetention(rec) {
    if (!rec.completed_date) return 0;
    let lastHitDate = rec.completed_date;
    let stability = 1;
    if (rec.sr3_done && rec.sr3_due) { lastHitDate = rec.sr3_due; stability = 6; }
    else if (rec.sr2_done && rec.sr2_due) { lastHitDate = rec.sr2_due; stability = 3.5; }
    else if (rec.sr1_done && rec.sr1_due) { lastHitDate = rec.sr1_due; stability = 2; }
    const t = Math.max(0, Math.round((new Date(todayStr) - new Date(lastHitDate)) / 86400000));
    return Math.round(100 * Math.exp(-t / (stability * 14)));
  }

  function getColor(pct) {
    if (pct >= 70) return '#10B981';
    if (pct >= 40) return '#F59E0B';
    return '#EF4444';
  }

  const subjects = FALLBACK_SUBJECTS.map(s => {
    const rec = srRecords.find(r => r.subject_name === s.name);
    if (!rec) return { name: s.name, pct: null };
    return { name: s.name, pct: getRetention(rec) };
  });

  return (
    <div>
      <div className="grid grid-cols-6 gap-1.5 mb-2">
        {subjects.map(s => (
          <div
            key={s.name}
            title={`${s.name}: ${s.pct !== null ? s.pct + '%' : 'not started'}`}
            className="aspect-square rounded-[4px]"
            style={{ backgroundColor: s.pct !== null ? getColor(s.pct) : '#E2E8F0' }}
          />
        ))}
      </div>
      <div className="flex items-center gap-3 mt-1">
        {[['#10B981', '≥70%'], ['#F59E0B', '40–70%'], ['#EF4444', '<40%'], ['#E2E8F0', 'Not started']].map(([color, label]) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: color }} />
            <span className="font-sans text-xs text-[#94A3B8]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SRModule({ logs, srRecords, completeSRHit, createSRRecord, subjects = [], settings = {} }) {
  const [srModal, setSrModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const srDue = getSRDue(srRecords, settings);
  const sr1Interval = settings.sr1_interval || 7;
  const todayStr = today();
  const in7 = format(addDays(new Date(), 7), 'yyyy-MM-dd');

  // Render directly from sr_records — no subjects table dependency
  const activeRecords = srRecords.filter(r => r.completed_date);

  const upcoming = srRecords.flatMap(rec =>
    ['sr1', 'sr2', 'sr3'].flatMap(hit => {
      const due = rec[`${hit}_due`];
      const done = rec[`${hit}_done`];
      if (!due || done || due <= todayStr || due > in7) return [];
      return [{ subject: rec.subject_name, hit, due }];
    })
  ).sort((a, b) => a.due.localeCompare(b.due));

  const dueOrOverdue = srDue.length > 0;

  async function handleSR(rating) {
    if (!srModal) return;
    setSaving(true);
    await completeSRHit(srModal.subjectName, srModal.hit, rating);
    setSaving(false);
    setSrModal(null);
  }

  // SR compliance %
  let totalSlots = 0, doneSlots = 0;
  srRecords.forEach(rec => {
    ['sr1', 'sr2', 'sr3'].forEach(hit => {
      if (rec[`${hit}_due`]) {
        totalSlots++;
        if (rec[`${hit}_done`]) doneSlots++;
      }
    });
  });
  const compliancePct = totalSlots > 0 ? Math.round((doneSlots / totalSlots) * 100) : 0;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-[#0F172A] mb-1">Spaced Repetition</h1>
        <p className="font-sans text-[#64748B] text-sm">
          {activeRecords.length} subjects in SR · {srDue.length} due today
        </p>
      </div>

      {/* Alert banner */}
      {dueOrOverdue && (
        <div className="flex items-center justify-between bg-[#FFFBEB] border border-[#FDE68A] rounded-[12px] px-5 py-4 mb-6">
          <div>
            <p className="font-sans text-sm font-bold text-[#B45309]">
              {srDue.filter(s => s.overdue).length > 0
                ? `${srDue.filter(s => s.overdue).length} overdue + ${srDue.filter(s => !s.overdue).length} due today`
                : `${srDue.length} SR review${srDue.length > 1 ? 's' : ''} due today`}
            </p>
            <p className="font-sans text-xs text-[#92400E] mt-0.5">
              {srDue.map(s => `${s.subject_name} (${s.label})`).join(' · ')}
            </p>
          </div>
          <button
            onClick={() => {
              const first = srDue[0];
              if (first) setSrModal({ subjectName: first.subject_name, hit: first.hit, hitLabel: first.label });
            }}
            className="font-sans text-sm font-bold text-[#B45309] border border-[#FDE68A] hover:bg-[#FEF3C7] px-4 py-2 rounded-[8px] cursor-pointer transition-all flex-shrink-0 ml-4"
          >
            Start Review →
          </button>
        </div>
      )}

      <div className="grid gap-6" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Left — subject cards */}
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

          {activeRecords.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[#94A3B8] font-sans text-sm">
              Complete your first milestone task to start SR tracking
            </div>
          ) : (
            activeRecords.map(rec => (
              <SRSubjectCard
                key={rec.subject_name}
                rec={rec}
                onMarkDue={(subject, hit, label) => setSrModal({ subjectName: subject, hit, hitLabel: label })}
              />
            ))
          )}
        </div>

        {/* Right — sticky sidebar */}
        <div className="flex flex-col gap-4 sticky top-6 self-start">
          <Card className="p-4">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-1">SR Compliance</h3>
            <div className="font-mono text-3xl font-bold text-[#0F2744] mb-3">{compliancePct}%</div>
            <SRDonut srRecords={srRecords} />
          </Card>

          {/* Due today list */}
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

          {/* Retention heatmap */}
          <Card className="p-4">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-3">Retention Heatmap</h3>
            <RetentionHeatmap srRecords={srRecords} />
          </Card>

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
