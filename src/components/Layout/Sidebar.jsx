import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, List, RefreshCw, BarChart2, Settings, LogOut } from 'lucide-react';

const NAV = [
  { to: '/',          label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/today',     label: 'Today',      icon: CalendarDays },
  { to: '/plan',      label: 'Study Plan', icon: List },
  { to: '/sr',        label: 'SR Module',  icon: RefreshCw },
  { to: '/analytics', label: 'Analytics',  icon: BarChart2 },
  { to: '/settings',  label: 'Settings',   icon: Settings },
];

export default function Sidebar({ user, signOut }) {
  return (
    <aside className="w-60 flex-shrink-0 bg-[#0F2744] flex flex-col h-screen sticky top-0">
      <div className="px-6 pt-7 pb-6 border-b border-white/10">
        <h1 className="font-serif text-2xl text-white mb-0.5">AMC Tracker</h1>
        <p className="font-sans text-xs text-white/40">Command Centre</p>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-[10px] font-sans text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:bg-white/8 hover:text-white/80'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-6 border-t border-white/10 pt-4">
        <div className="px-3 py-2 mb-2">
          <p className="font-sans text-xs text-white/40 truncate">{user?.email}</p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[10px] font-sans text-sm font-semibold text-white/50 hover:bg-white/8 hover:text-white/80 transition-all cursor-pointer"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
