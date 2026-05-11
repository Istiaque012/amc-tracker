import { parseISO, differenceInDays, format } from 'date-fns';
import { CHART_START, EXAM_DATE } from '../../lib/constants';

const today = format(new Date(), 'yyyy-MM-dd');

function dotColor(date, done) {
  if (!date) return '#E2E8F0';
  if (done) return '#10B981';
  if (date < today) return '#EF4444';
  if (date === today) return '#F59E0B';
  return '#94A3B8';
}

export default function SRTimeline({ srRecords }) {
  const subjects = srRecords.filter(r => r.completed_date);
  if (subjects.length === 0) {
    return <div className="flex items-center justify-center h-32 text-[#94A3B8] text-sm font-sans">No completed subjects yet</div>;
  }

  const start = parseISO(CHART_START);
  const end = parseISO(EXAM_DATE);
  const totalDays = differenceInDays(end, start);
  const W = 860, ROW_H = 36, PAD_L = 120, PAD_R = 20;
  const chartW = W - PAD_L - PAD_R;
  const H = subjects.length * ROW_H + 40;
  const todayOff = differenceInDays(new Date(), start);
  const todayX = PAD_L + (todayOff / totalDays) * chartW;

  function xOf(dateStr) {
    const d = differenceInDays(parseISO(dateStr), start);
    return PAD_L + (d / totalDays) * chartW;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible' }}>
      {/* Today line */}
      <line x1={todayX} y1={0} x2={todayX} y2={H - 20} stroke="#EF4444" strokeWidth="1" strokeDasharray="4 3" />
      <text x={todayX + 3} y={10} fontSize="9" fill="#EF4444" fontFamily="Nunito">Today</text>

      {subjects.map((rec, i) => {
        const y = i * ROW_H + 30;
        const points = [
          { date: rec.completed_date, done: true, label: 'Done' },
          { date: rec.sr1_due, done: rec.sr1_done, label: 'SR1' },
          { date: rec.sr2_due, done: rec.sr2_done, label: 'SR2' },
          { date: rec.sr3_due, done: rec.sr3_done, label: 'SR3' },
        ].filter(p => p.date);

        return (
          <g key={rec.subject_name}>
            <text x={PAD_L - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#334155" fontFamily="Nunito" fontWeight="600">
              {rec.subject_name}
            </text>
            {points.map((p, pi) => {
              const x = xOf(p.date);
              const color = dotColor(p.date, p.done);
              return (
                <g key={pi}>
                  {pi > 0 && (
                    <line x1={xOf(points[pi - 1].date)} y1={y} x2={x} y2={y}
                      stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="3 2" />
                  )}
                  <circle cx={x} cy={y} r="6" fill={color} />
                  <text x={x} y={y - 10} textAnchor="middle" fontSize="8" fill="#94A3B8" fontFamily="DM Mono">{p.label}</text>
                  {p.done && (
                    <text x={x} y={y + 4} textAnchor="middle" fontSize="7" fill="white" fontFamily="DM Mono">✓</text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
