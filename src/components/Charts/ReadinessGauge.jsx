export default function ReadinessGauge({ value = 0 }) {
  const SIZE = 200;
  const CX = SIZE / 2;
  const CY = SIZE / 2 + 20;
  const R = 72;
  const startAngle = -180;
  const endAngle = 0;
  const range = endAngle - startAngle;
  const pct = Math.min(99, Math.max(0, value));
  const angle = startAngle + (pct / 99) * range;

  function polarToXY(deg, r) {
    const rad = (deg * Math.PI) / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
  }

  function arcPath(startDeg, endDeg, r) {
    const s = polarToXY(startDeg, r);
    const e = polarToXY(endDeg, r);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const color = pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444';
  const needle = polarToXY(angle, R - 10);

  return (
    <div className="flex flex-col items-center">
      <svg width={SIZE} height={SIZE / 2 + 40} viewBox={`0 0 ${SIZE} ${SIZE / 2 + 40}`}>
        {/* Background arc */}
        <path d={arcPath(-180, 0, R)} fill="none" stroke="#F1F5F9" strokeWidth="14" strokeLinecap="round" />
        {/* Colored arc */}
        {pct > 0 && (
          <path d={arcPath(-180, angle, R)} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
            style={{ transition: 'all 0.8s ease' }} />
        )}
        {/* Needle */}
        <line
          x1={CX} y1={CY}
          x2={needle.x} y2={needle.y}
          stroke="#0F2744" strokeWidth="3" strokeLinecap="round"
          style={{ transition: 'all 0.8s ease', transformOrigin: `${CX}px ${CY}px` }}
        />
        <circle cx={CX} cy={CY} r="5" fill="#0F2744" />
        {/* Labels */}
        <text x={CX - R - 10} y={CY + 18} textAnchor="middle" fontSize="10" fill="#94A3B8" fontFamily="DM Mono">0</text>
        <text x={CX + R + 10} y={CY + 18} textAnchor="middle" fontSize="10" fill="#94A3B8" fontFamily="DM Mono">99</text>
      </svg>
      <div className="text-center -mt-2">
        <div className="font-mono text-4xl font-bold" style={{ color }}>{pct}</div>
        <div className="font-sans text-xs text-[#64748B] uppercase tracking-widest mt-1">Readiness Score</div>
      </div>
    </div>
  );
}
