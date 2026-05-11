import { calcRetention, getStability } from '../../lib/studyUtils';
import { SUBJECTS } from '../../lib/constants';

function retentionColor(r) {
  if (r === null) return '#F1F5F9';
  if (r >= 70) return '#10B981';
  if (r >= 50) return '#F59E0B';
  if (r >= 30) return '#F97316';
  return '#EF4444';
}

function retentionText(r) {
  if (r === null) return '#94A3B8';
  if (r >= 70) return '#065F46';
  if (r >= 50) return '#92400E';
  if (r >= 30) return '#7C2D12';
  return '#991B1B';
}

export default function RetentionMap({ srRecords, logs }) {
  const completedTaskIds = new Set(logs.filter(l => l.status === 'complete').map(l => l.task_num));

  return (
    <div className="grid grid-cols-6 gap-3">
      {SUBJECTS.map(subject => {
        const isStudied = completedTaskIds.has(subject.milestoneTaskId);
        const rec = srRecords.find(r => r.subject_name === subject.name);
        let retention = null;
        if (isStudied && rec) {
          const lastDate = rec.sr3_done_date || rec.sr2_done_date || rec.sr1_done_date || rec.completed_date;
          const stability = getStability(rec);
          retention = calcRetention(lastDate, stability);
        } else if (isStudied && !rec) {
          const logEntry = logs.find(l => l.task_num === subject.milestoneTaskId);
          if (logEntry) retention = calcRetention(logEntry.date, 1);
        }

        const bg = retentionColor(retention);
        const tc = retentionText(retention);

        return (
          <div key={subject.name}
            className="rounded-[10px] p-3 border"
            style={{ backgroundColor: isStudied ? `${bg}40` : '#F8FAFC', borderColor: isStudied ? bg : '#E2E8F0' }}>
            <div className="font-sans text-xs font-semibold text-[#334155] truncate">{subject.name}</div>
            {retention !== null ? (
              <>
                <div className="font-mono text-lg font-bold mt-1" style={{ color: tc }}>{retention}%</div>
                <div className="h-1.5 rounded-full mt-1" style={{ backgroundColor: '#E2E8F0' }}>
                  <div className="h-full rounded-full" style={{ width: `${retention}%`, backgroundColor: bg }} />
                </div>
              </>
            ) : (
              <div className="font-sans text-xs text-[#94A3B8] mt-1">Not studied</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
