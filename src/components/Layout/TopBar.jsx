import { useLocation } from 'react-router-dom';
import { daysUntilExam } from '../../lib/dateUtils';
import { EXAM_DATE } from '../../lib/constants';

const TITLES = {
  '/':          'Dashboard',
  '/today':     'Today',
  '/plan':      'Study Plan',
  '/sr':        'SR Module',
  '/analytics': 'Analytics',
};

export default function TopBar() {
  const { pathname } = useLocation();
  const daysLeft = daysUntilExam(EXAM_DATE);

  return (
    <header className="h-[58px] bg-white border-b border-[#E2E8F0] sticky top-0 z-10 flex items-center justify-between px-8">
      <h2 className="font-sans font-bold text-[#0F172A] text-base">{TITLES[pathname] || 'AMC Tracker'}</h2>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs text-[#94A3B8]">Exam in</span>
          <span className={`font-mono text-sm font-bold ${daysLeft < 30 ? 'text-[#EF4444]' : 'text-[#0F2744]'}`}>
            {daysLeft}d
          </span>
        </div>
      </div>
    </header>
  );
}
