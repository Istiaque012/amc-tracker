import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Badge from '../Common/Badge';
import Button from '../Common/Button';
import { calcRetention, getStability } from '../../lib/studyUtils';
import { formatShort } from '../../lib/dateUtils';

const today = new Date().toISOString().slice(0, 10);

function hitStatus(rec, hit) {
  const due = rec[`${hit}_due`];
  const done = rec[`${hit}_done`];
  if (!due) return 'unavailable';
  if (done) return 'done';
  if (due < today) return 'overdue';
  if (due === today) return 'due';
  return 'upcoming';
}

function statusBadge(status) {
  if (status === 'done') return <Badge variant="green">Done</Badge>;
  if (status === 'overdue') return <Badge variant="red">Overdue</Badge>;
  if (status === 'due') return <Badge variant="amber">Due Today</Badge>;
  if (status === 'upcoming') return <Badge variant="gray">Upcoming</Badge>;
  return <Badge variant="gray">Pending</Badge>;
}

export default function SRSubjectCard({ rec, onMarkDue }) {
  const [open, setOpen] = useState(false);

  const stability = getStability(rec);
  const lastDate = rec.sr3_done_date || rec.sr2_done_date || rec.sr1_done_date || rec.completed_date;
  const retention = lastDate ? calcRetention(lastDate, stability) : null;

  const retColor = retention === null ? '#94A3B8' : retention >= 70 ? '#10B981' : retention >= 50 ? '#F59E0B' : '#EF4444';

  const hits = [
    { key: 'sr1', label: 'SR1', due: rec.sr1_due, done: rec.sr1_done, rating: rec.sr1_rating, doneDate: rec.sr1_done_date },
    { key: 'sr2', label: 'SR2', due: rec.sr2_due, done: rec.sr2_done, rating: rec.sr2_rating, doneDate: rec.sr2_done_date },
    { key: 'sr3', label: 'SR3', due: rec.sr3_due, done: rec.sr3_done, rating: rec.sr3_rating, doneDate: rec.sr3_done_date },
  ];

  const anyDue = hits.some(h => { const s = hitStatus(rec, h.key); return s === 'due' || s === 'overdue'; });

  return (
    <div className={`rounded-[14px] border transition-all ${anyDue ? 'border-[#FDE68A] bg-[#FFFBEB]' : 'border-[#E2E8F0] bg-white'}`}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="font-sans font-bold text-[#0F172A]">{rec.subject_name}</span>
          {rec.completed_date && (
            <span className="font-sans text-xs text-[#94A3B8]">Completed {formatShort(rec.completed_date)}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {retention !== null && (
            <span className="font-mono text-sm font-bold" style={{ color: retColor }}>{retention}%</span>
          )}
          {open ? <ChevronUp size={16} className="text-[#94A3B8]" /> : <ChevronDown size={16} className="text-[#94A3B8]" />}
        </div>
      </div>

      {open && (
        <div className="border-t border-[#E2E8F0] px-4 py-3 flex flex-col gap-2">
          {hits.map(h => {
            const status = hitStatus(rec, h.key);
            return (
              <div key={h.key} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-[#64748B] w-8">{h.label}</span>
                  {statusBadge(status)}
                  {h.due && <span className="font-mono text-xs text-[#94A3B8]">Due {formatShort(h.due)}</span>}
                  {h.done && h.rating && (
                    <span className="font-sans text-xs text-[#64748B] capitalize">{h.rating} · {formatShort(h.doneDate)}</span>
                  )}
                </div>
                {(status === 'due' || status === 'overdue') && (
                  <Button size="sm" variant="amber" onClick={() => onMarkDue(rec.subject_name, h.key, h.label)}>
                    Mark Done →
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
