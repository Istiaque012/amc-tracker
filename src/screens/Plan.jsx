import { useState, useMemo } from 'react';
import { Search, Pencil, Trash2, Info } from 'lucide-react';
import Card from '../components/Common/Card';
import Badge from '../components/Common/Badge';
import Button from '../components/Common/Button';
import Modal from '../components/Common/Modal';
import { getProjectedDates } from '../lib/studyUtils';
import { formatShort, today as getToday } from '../lib/dateUtils';
import { TASKS as FALLBACK_TASKS } from '../lib/constants';

const FILTERS = ['All', 'Done', 'Upcoming', 'Phase 1', 'Phase 2', 'Phase 3'];

export default function Plan({ logs, upsertLog, deleteLog, tasks: rawTasks = [], settings = {} }) {
  const usingFallback = rawTasks.length === 0;
  const tasks = usingFallback ? FALLBACK_TASKS : rawTasks;
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [editStatus, setEditStatus] = useState('complete');
  const [editEMedici, setEditEMedici] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const completedMap = useMemo(() => {
    const m = {};
    logs.filter(l => l.status === 'complete').forEach(l => {
      if (l.task_id) m[l.task_id] = l;
      if (l.task_num) m[String(l.task_num)] = l;
    });
    return m;
  }, [logs]);

  const projected = useMemo(() => getProjectedDates(logs, tasks, settings), [logs, tasks, settings]);

  function isTaskDone(task) {
    return !!(completedMap[task.id] || completedMap[String(task.sort_order)]);
  }

  const filtered = useMemo(() => {
    return tasks.filter(task => {
      const done = isTaskDone(task);
      if (filter === 'Done' && !done) return false;
      if (filter === 'Upcoming' && done) return false;
      if (filter === 'Phase 1' && task.phase !== 1) return false;
      if (filter === 'Phase 2' && task.phase !== 2) return false;
      if (filter === 'Phase 3' && task.phase !== 3) return false;
      if (search) {
        const q = search.toLowerCase();
        return (task.title || '').toLowerCase().includes(q) || (task.subject || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [filter, search, completedMap, tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextSortOrder = logs.filter(l => l.status === 'complete').length + 1;

  function openEdit(task) {
    const log = completedMap[task.id] || completedMap[String(task.sort_order)];
    setEditStatus(log?.status || 'complete');
    setEditEMedici(log?.e_medici || 0);
    setDeleteConfirm(false);
    setEditModal({ task, log });
  }

  async function handleSaveEdit() {
    if (!editModal?.log) return;
    setSaving(true);
    const log = editModal.log;
    await upsertLog({
      date: log.date,
      status: editStatus,
      task_num: log.task_num,
      task_id: log.task_id,
      e_medici: editEMedici,
      blocks: log.blocks || [],
      partial_pct: log.partial_pct || 0,
    });
    setSaving(false);
    setEditModal(null);
  }

  async function handleDelete() {
    if (!editModal?.log) return;
    setSaving(true);
    await deleteLog(editModal.log.date);
    setSaving(false);
    setEditModal(null);
  }

  const qbName = settings.question_bank_name || 'eMedici';

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-[#0F172A] mb-1">Study Plan</h1>
        <p className="font-sans text-[#64748B] text-sm">{tasks.length || 77} tasks across 3 phases</p>
      </div>

      {usingFallback && (
        <div className="flex items-center gap-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px] px-4 py-3 mb-6">
          <Info size={16} className="text-[#B45309] flex-shrink-0" />
          <p className="font-sans text-sm text-[#B45309]">
            Using default task list. Go to Settings to customise your subjects and tasks.
          </p>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex gap-1 bg-[#F1F5F9] p-1 rounded-[10px]">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-[8px] font-sans text-sm font-semibold transition-all cursor-pointer ${
                filter === f ? 'bg-white text-[#0F2744] shadow-sm' : 'text-[#64748B] hover:text-[#334155]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full pl-8 pr-3 py-2 border border-[#E2E8F0] rounded-[10px] font-sans text-sm outline-none focus:border-[#3B82F6]"
          />
        </div>
        <span className="font-sans text-sm text-[#94A3B8]">{filtered.length} tasks</span>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                {['#', 'Task', 'Subject', 'Phase', qbName, 'Status', 'Date', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-sans text-xs font-bold uppercase tracking-wider text-[#94A3B8]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(task => {
                const done = isTaskDone(task);
                const log = completedMap[task.id] || completedMap[String(task.sort_order)];
                const isNext = !done && task.sort_order === nextSortOrder;
                return (
                  <tr key={task.id || task.sort_order} className={`border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors ${isNext ? 'bg-[#EFF6FF]' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-[#94A3B8]">{task.sort_order || task.id}</td>
                    <td className="px-4 py-3 max-w-[280px]">
                      <span className={`font-sans text-sm ${done ? 'text-[#94A3B8] line-through' : 'text-[#0F172A] font-medium'}`}>
                        {task.title}
                      </span>
                      {(task.is_milestone || task.isMilestone) && (
                        <span className="ml-2 font-sans text-xs text-[#F59E0B]">★</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm text-[#64748B]">{task.subject}</td>
                    <td className="px-4 py-3">
                      <Badge variant={task.phase === 1 ? 'blue' : task.phase === 2 ? 'purple' : 'green'}>
                        P{task.phase}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-[#64748B]">{task.emedici_qty || task.eQty}</td>
                    <td className="px-4 py-3">
                      {done ? <Badge variant="green">Done ✓</Badge>
                        : isNext ? <Badge variant="blue">Next →</Badge>
                        : <Badge variant="gray">Pending</Badge>}
                    </td>
                    <td className="px-4 py-3" style={{ minWidth: 110, whiteSpace: 'nowrap' }}>
                      {done && log ? (
                        <span className="font-mono text-xs" style={{ color: '#16A34A', fontWeight: 600 }}>{formatShort(log.date)}</span>
                      ) : projected[task.id] ? (
                        <span className="font-mono text-xs" style={{
                          color: projected[task.id] < getToday() ? '#DC2626' : '#374151',
                          fontWeight: projected[task.id] < getToday() ? 600 : 500,
                        }}>~{formatShort(projected[task.id])}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {done && (
                        <button onClick={() => openEdit(task)} className="p-1.5 rounded-[8px] hover:bg-[#F1F5F9] text-[#94A3B8] cursor-pointer">
                          <Pencil size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={editModal ? `Edit — Task #${editModal.task.sort_order || editModal.task.id}` : ''}>
        {editModal && (
          <div className="flex flex-col gap-4">
            <p className="font-sans text-sm text-[#64748B]">{editModal.task.title}</p>
            <div>
              <label className="font-sans text-xs font-bold uppercase tracking-wider text-[#64748B] block mb-2">Status</label>
              <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-[10px] px-3 py-2.5 font-sans text-sm outline-none focus:border-[#3B82F6]">
                <option value="complete">Complete</option>
                <option value="partial">Partial</option>
                <option value="missed">Missed</option>
              </select>
            </div>
            <div>
              <label className="font-sans text-xs font-bold uppercase tracking-wider text-[#64748B] block mb-2">{qbName} Done</label>
              <input type="number" min="0" value={editEMedici} onChange={e => setEditEMedici(+e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-[10px] px-3 py-2.5 font-mono text-sm outline-none focus:border-[#3B82F6]" />
            </div>

            {!deleteConfirm ? (
              <div className="flex gap-3">
                <Button onClick={handleSaveEdit} disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save Changes'}</Button>
                <Button variant="danger" onClick={() => setDeleteConfirm(true)}><Trash2 size={14} /></Button>
                <Button variant="secondary" onClick={() => setEditModal(null)}>Cancel</Button>
              </div>
            ) : (
              <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] p-3">
                <p className="font-sans text-sm text-[#DC2626] mb-3">Delete this log entry?</p>
                <div className="flex gap-2">
                  <Button variant="danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting…' : 'Yes, Delete'}</Button>
                  <Button variant="secondary" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
