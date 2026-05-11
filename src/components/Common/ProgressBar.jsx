export default function ProgressBar({ value, max, color = '#3B82F6', height = 8, className = '' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`w-full bg-[#F1F5F9] rounded-full overflow-hidden ${className}`} style={{ height }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}
