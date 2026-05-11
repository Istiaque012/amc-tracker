import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

const WORK_SECS = 50 * 60;
const BREAK_SECS = 10 * 60;
const LONG_BREAK_SECS = 30 * 60;

export default function PomodoroTimer() {
  const [mode, setMode] = useState('work'); // 'work' | 'break' | 'long'
  const [secondsLeft, setSecondsLeft] = useState(WORK_SECS);
  const [running, setRunning] = useState(false);
  const [blockCount, setBlockCount] = useState(0);
  const intervalRef = useRef(null);

  const totalSecs = mode === 'work' ? WORK_SECS : mode === 'long' ? LONG_BREAK_SECS : BREAK_SECS;
  const progress = (secondsLeft / totalSecs) * 100;
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  const SIZE = 160;
  const R = 68;
  const CIRC = 2 * Math.PI * R;
  const dash = (progress / 100) * CIRC;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (mode === 'work') {
              const newCount = blockCount + 1;
              setBlockCount(newCount);
              if (newCount % 4 === 0) {
                setMode('long');
                setSecondsLeft(LONG_BREAK_SECS);
              } else {
                setMode('break');
                setSecondsLeft(BREAK_SECS);
              }
            } else {
              setMode('work');
              setSecondsLeft(WORK_SECS);
            }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode, blockCount]);

  function handleReset() {
    setRunning(false);
    setMode('work');
    setSecondsLeft(WORK_SECS);
    setBlockCount(0);
  }

  const modeLabel = mode === 'work' ? 'Focus Block' : mode === 'long' ? 'Long Break' : 'Break Time';
  const modeColor = mode === 'work' ? '#0F2744' : '#10B981';

  return (
    <div className="flex flex-col items-center gap-4 p-5 bg-white rounded-[14px] border border-[#E2E8F0]">
      <p className="font-sans text-xs font-bold uppercase tracking-widest text-[#64748B]">{modeLabel}</p>

      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="#F1F5F9" strokeWidth="8" />
          <circle
            cx={SIZE/2} cy={SIZE/2} r={R}
            fill="none"
            stroke={modeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-4xl font-bold text-[#0F172A]">{mins}:{secs}</span>
          <span className="font-sans text-xs text-[#64748B] mt-1">Block {blockCount + 1}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setRunning(r => !r)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-sans font-semibold text-sm text-white transition-colors cursor-pointer"
          style={{ backgroundColor: modeColor }}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={handleReset}
          className="p-2.5 rounded-[10px] border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <p className="font-sans text-xs text-[#94A3B8]">
        {blockCount} block{blockCount !== 1 ? 's' : ''} completed today
      </p>
    </div>
  );
}
