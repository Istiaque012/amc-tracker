import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, parseISO } from 'date-fns';
import { TASKS } from '../../lib/constants';

export default function EMediciAreaChart({ logs }) {
  const completeLogs = logs
    .filter(l => l.status === 'complete')
    .sort((a, b) => a.date.localeCompare(b.date));

  if (completeLogs.length < 2) {
    return <div className="flex items-center justify-center h-[220px] text-[#94A3B8] text-sm font-sans">Need at least 2 logged days</div>;
  }

  let cumDone = 0, cumTarget = 0;
  const data = completeLogs.map(l => {
    const task = TASKS.find(t => t.id === l.task_num);
    cumTarget += task ? task.eQty : 0;
    cumDone += l.e_medici || 0;
    return {
      date: format(parseISO(l.date), 'd MMM'),
      done: cumDone,
      target: cumTarget,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="eDone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: 'DM Mono' }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ fontFamily: 'Nunito', fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
        />
        <Area type="monotone" dataKey="target" stroke="#CBD5E1" strokeWidth={2} strokeDasharray="5 5"
          fill="none" name="Target" />
        <Area type="monotone" dataKey="done" stroke="#3B82F6" strokeWidth={2}
          fill="url(#eDone)" name="Done" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
