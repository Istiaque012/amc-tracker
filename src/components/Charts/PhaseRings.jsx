function Ring({ value, total, color, label, size = 90 }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const R = 36;
  const CIRC = 2 * Math.PI * R;
  const dash = (pct / 100) * CIRC;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 90 90" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="45" cy="45" r={R} fill="none" stroke="#F1F5F9" strokeWidth="7" />
          <circle cx="45" cy="45" r={R} fill="none" stroke={color} strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
            style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-sm font-bold text-[#0F172A]">{value}</span>
          <span className="font-sans text-[9px] text-[#94A3B8]">/{total}</span>
        </div>
      </div>
      <span className="font-sans text-xs font-semibold text-[#64748B]">{label}</span>
    </div>
  );
}

export default function PhaseRings({ phase1, phase2, phase3 }) {
  return (
    <div className="flex justify-around items-end py-2">
      <Ring value={phase1.done} total={phase1.total} color="#3B82F6" label="Phase 1" />
      <Ring value={phase2.done} total={phase2.total} color="#8B5CF6" label="Phase 2" />
      <Ring value={phase3.done} total={phase3.total} color="#10B981" label="Phase 3" />
    </div>
  );
}
