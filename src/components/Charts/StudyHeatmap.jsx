import { parseISO, format, eachDayOfInterval, getDay } from 'date-fns';
import { useState } from 'react';
import { CHART_START, EXAM_DATE } from '../../lib/constants';

function getColor(log) {
  if (!log) return '#F1F5F9';
  if (log.status === 'missed') return '#FECACA';
  if (log.status === 'rest') return '#BFDBFE';
  const e = log.e_medici || 0;
  if (e === 0) return '#E0F2FE';
  if (e < 20) return '#93C5FD';
  if (e < 40) return '#3B82F6';
  return '#1D4ED8';
}

export default function StudyHeatmap({ logs }) {
  const [tooltip, setTooltip] = useState(null);

  const logMap = {};
  logs.forEach(l => { logMap[l.date] = l; });

  const start = parseISO(CHART_START);
  const end = parseISO(EXAM_DATE);
  const days = eachDayOfInterval({ start, end });

  // Build weeks (columns)
  const weeks = [];
  let week = new Array(getDay(start)).fill(null);
  days.forEach(d => {
    const ds = format(d, 'yyyy-MM-dd');
    week.push({ date: ds, log: logMap[ds] || null });
    if (week.length === 7) { weeks.push(week); week = []; }
  });
  if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }

  const months = [];
  let lastMonth = null;
  weeks.forEach((w, wi) => {
    const firstReal = w.find(d => d && d.date);
    if (firstReal) {
      const m = format(parseISO(firstReal.date), 'MMM');
      if (m !== lastMonth) { months.push({ label: m, col: wi }); lastMonth = m; }
    }
  });

  const CELL = 13, GAP = 3;

  return (
    <div className="overflow-x-auto">
      <div className="relative inline-block">
        {/* Month labels */}
        <div className="flex mb-1" style={{ marginLeft: 22 }}>
          {months.map((m, i) => (
            <span key={i} className="font-sans text-[10px] text-[#94A3B8] absolute"
              style={{ left: 22 + m.col * (CELL + GAP) }}>
              {m.label}
            </span>
          ))}
        </div>
        <div className="mt-4 flex gap-0" style={{ gap: GAP }}>
          {/* Day labels */}
          <div className="flex flex-col" style={{ gap: GAP, marginRight: 4 }}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <span key={i} className="font-sans text-[9px] text-[#CBD5E1]"
                style={{ height: CELL, lineHeight: `${CELL}px` }}>{d}</span>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
              {week.map((cell, di) => {
                if (!cell) return <div key={di} style={{ width: CELL, height: CELL }} />;
                return (
                  <div
                    key={di}
                    style={{ width: CELL, height: CELL, backgroundColor: getColor(cell.log), borderRadius: 3, cursor: 'pointer' }}
                    onMouseEnter={() => setTooltip({ ...cell, x: wi * (CELL + GAP), y: di * (CELL + GAP) })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
        {tooltip && (
          <div className="absolute z-10 bg-[#0F2744] text-white text-xs font-sans rounded-lg px-3 py-2 pointer-events-none whitespace-nowrap shadow-lg"
            style={{ left: tooltip.x + 20, top: tooltip.y - 10 }}>
            <div className="font-semibold">{tooltip.date}</div>
            <div>Status: {tooltip.log?.status || 'no data'}</div>
            {tooltip.log && <div>eMedici: {tooltip.log.e_medici || 0}</div>}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        {[
          { color: '#F1F5F9', label: 'No data' },
          { color: '#BFDBFE', label: 'Rest' },
          { color: '#FECACA', label: 'Missed' },
          { color: '#E0F2FE', label: '0 Qs' },
          { color: '#93C5FD', label: '<20 Qs' },
          { color: '#3B82F6', label: '<40 Qs' },
          { color: '#1D4ED8', label: '40+ Qs' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div style={{ width: 10, height: 10, backgroundColor: color, borderRadius: 2 }} />
            <span className="font-sans text-[10px] text-[#94A3B8]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
