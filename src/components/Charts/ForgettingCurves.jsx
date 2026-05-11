import { parseISO, differenceInDays, format, eachDayOfInterval } from 'date-fns';
import { CHART_START, EXAM_DATE } from '../../lib/constants';
import { getStability } from '../../lib/studyUtils';

const COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#F97316','#EC4899',
  '#14B8A6','#6366F1','#84CC16','#FB923C','#A855F7','#22D3EE','#4ADE80','#F472B6','#60A5FA','#34D399'];

function calcR(daysSince, stability) {
  if (daysSince < 0) return 100;
  return Math.max(0, Math.min(100, Math.round(100 * Math.exp(-daysSince / (stability * 14)))));
}

export default function ForgettingCurves({ srRecords, logs }) {
  const start = parseISO(CHART_START);
  const end = parseISO(EXAM_DATE);
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const totalDays = differenceInDays(end, start);

  const completedLogs = logs.filter(l => l.status === 'complete');

  const subjects = srRecords.filter(r => r.completed_date).map((rec, i) => {
    const reviews = [
      { date: rec.completed_date, stability: 1 },
      rec.sr1_done_date ? { date: rec.sr1_done_date, stability: 2 } : null,
      rec.sr2_done_date ? { date: rec.sr2_done_date, stability: 3.5 } : null,
      rec.sr3_done_date ? { date: rec.sr3_done_date, stability: 6 } : null,
    ].filter(Boolean).sort((a, b) => a.date.localeCompare(b.date));

    if (reviews.length === 0) return null;

    const points = [];
    for (let d = 0; d <= totalDays; d++) {
      const dateStr = format(new Date(start.getTime() + d * 86400000), 'yyyy-MM-dd');
      // Find applicable review
      let lastReview = null;
      for (const rev of reviews) {
        if (rev.date <= dateStr) lastReview = rev;
        else break;
      }
      if (!lastReview) continue;
      const daysSince = differenceInDays(parseISO(dateStr), parseISO(lastReview.date));
      const r = calcR(daysSince, lastReview.stability);
      points.push({ d, r, dateStr });
    }

    return { name: rec.subject_name, points, color: COLORS[i % COLORS.length], reviews };
  }).filter(Boolean);

  if (subjects.length === 0) {
    return <div className="flex items-center justify-center h-[300px] text-[#94A3B8] text-sm font-sans">Complete subjects to see forgetting curves</div>;
  }

  const W = 900, H = 280, PAD = { t: 20, r: 20, b: 40, l: 50 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;
  const todayX = PAD.l + (differenceInDays(today, start) / totalDays) * chartW;

  function xOf(d) { return PAD.l + (d / totalDays) * chartW; }
  function yOf(r) { return PAD.t + chartH - (r / 100) * chartH; }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible' }}>
        <defs>
          {subjects.map(s => (
            <linearGradient key={s.name} id={`grad-${s.name.replace(/[^a-z]/gi,'')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid */}
        {[0,25,50,75,100].map(y => (
          <g key={y}>
            <line x1={PAD.l} y1={yOf(y)} x2={W - PAD.r} y2={yOf(y)} stroke="#F1F5F9" strokeWidth="1" />
            <text x={PAD.l - 6} y={yOf(y) + 4} textAnchor="end" fontSize="10" fill="#CBD5E1" fontFamily="DM Mono">{y}</text>
          </g>
        ))}

        {/* Month x-axis labels */}
        {['May','Jun','Jul','Aug'].map((m, i) => {
          const offsets = [0, 27, 58, 89];
          const x = xOf(offsets[i]);
          return <text key={m} x={x} y={H - 8} textAnchor="middle" fontSize="10" fill="#CBD5E1" fontFamily="DM Mono">{m}</text>;
        })}

        {/* Today line */}
        <line x1={todayX} y1={PAD.t} x2={todayX} y2={H - PAD.b} stroke="#EF4444" strokeWidth="1.5" strokeDasharray="4 3" />
        <text x={todayX + 4} y={PAD.t + 12} fontSize="9" fill="#EF4444" fontFamily="Nunito">Today</text>

        {subjects.map(s => {
          if (s.points.length < 2) return null;
          const path = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.d)} ${yOf(p.r)}`).join(' ');
          const area = path + ` L ${xOf(s.points[s.points.length - 1].d)} ${yOf(0)} L ${xOf(s.points[0].d)} ${yOf(0)} Z`;
          const gradId = `grad-${s.name.replace(/[^a-z]/gi,'')}`;
          const curPoint = s.points.find(p => p.dateStr === todayStr) || s.points[s.points.length - 1];
          return (
            <g key={s.name}>
              <path d={area} fill={`url(#${gradId})`} />
              <path d={path} fill="none" stroke={s.color} strokeWidth="2" />
              {/* Review dots */}
              {s.reviews.map(rev => {
                const d = differenceInDays(parseISO(rev.date), start);
                return <circle key={rev.date} cx={xOf(d)} cy={yOf(100)} r="4" fill={s.color} />;
              })}
              {/* Current dot */}
              {curPoint && (
                <circle cx={xOf(curPoint.d)} cy={yOf(curPoint.r)} r="5" fill={s.color} stroke="white" strokeWidth="2">
                  <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {subjects.map(s => (
          <div key={s.name} className="flex items-center gap-1.5">
            <div style={{ width: 12, height: 3, backgroundColor: s.color, borderRadius: 2 }} />
            <span className="font-sans text-xs text-[#64748B]">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
