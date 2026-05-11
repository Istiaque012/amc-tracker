import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function SRDonut({ srRecords }) {
  let done = 0, pending = 0, overdue = 0;
  const today = new Date().toISOString().slice(0, 10);

  srRecords.forEach(r => {
    ['sr1', 'sr2', 'sr3'].forEach(hit => {
      const due = r[`${hit}_due`];
      const isDone = r[`${hit}_done`];
      if (!due) return;
      if (isDone) { done++; return; }
      if (due < today) { overdue++; return; }
      pending++;
    });
  });

  const data = [
    { name: 'Done', value: done, color: '#10B981' },
    { name: 'Pending', value: pending, color: '#3B82F6' },
    { name: 'Overdue', value: overdue, color: '#EF4444' },
  ].filter(d => d.value > 0);

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-32 text-[#94A3B8] text-sm font-sans">No SR data yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={72}
          dataKey="value" paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(v, n) => [v, n]} />
        <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 12, fontFamily: 'Nunito' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
