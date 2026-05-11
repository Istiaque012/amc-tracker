import { useState, useEffect, useRef } from 'react';
import { Plus, CheckSquare, Square } from 'lucide-react';
import Card from '../components/Common/Card';
import Badge from '../components/Common/Badge';
import Button from '../components/Common/Button';
import Modal from '../components/Common/Modal';
import ProgressBar from '../components/Common/ProgressBar';
import PomodoroTimer from '../components/Timer/PomodoroTimer';
import { today, formatDisplay, isCDPathDay } from '../lib/dateUtils';
import { getNextTask, getDeficit, getSRDue } from '../lib/studyUtils';
import { CD_PATH_BLOCKS, GYM_BLOCKS } from '../lib/constants';

const STATUS_OPTIONS = [
  { key: 'complete', label: 'Complete', icon: '✅', color: '#10B981' },
  { key: 'partial',  label: 'Partial',  icon: '⚠️', color: '#F59E0B' },
  { key: 'missed',   label: 'Missed',   icon: '❌', color: '#EF4444' },
  { key: 'rest',     label: 'Rest Day', icon: '🔵', color: '#3B82F6' },
];

export default function Today({
  logs, srRecords, upsertLog, updateBlocks, deleteLog,
  tasks = [], todayBlocks = [], scheduleTemplateName = 'Today',
  settings = {}, questionLogs = [], addQuestionLog, subjects = [],
}) {
  const todayStr = today();
  const todayLog = logs.find(l => l.date === todayStr);
  const nextTask = getNextTask(logs, tasks);
  const task = (tasks.length > 0
    ? tasks.find(t => t.id === (todayLog?.task_id) || t.sort_order === (todayLog?.task_num ?? nextTask?.sort_order))
    : null) || nextTask;
  const srDue = getSRDue(srRecords, settings);
  const deficit = getDeficit(logs, tasks);
  const qbName = settings.question_bank_name || 'eMedici';

  function getDefaultBlocks() {
    const fallback = isCDPathDay(todayStr) ? CD_PATH_BLOCKS : GYM_BLOCKS;
    return fallback.map(b => ({ ...b, done: false, note: '' }));
  }

  const [blocks, setBlocks] = useState(() => {
    if (todayLog?.blocks?.length > 0) return todayLog.blocks;
    if (todayBlocks.length > 0) return todayBlocks;
    return getDefaultBlocks();
  });

  const debounceRef = useRef(null);

  useEffect(() => {
    if (todayLog?.blocks?.length > 0) {
      setBlocks(todayLog.blocks);
    } else if (todayBlocks.length > 0) {
      setBlocks(todayBlocks);
    } else {
      setBlocks(getDefaultBlocks());
    }
  }, [todayLog?.date, todayBlocks.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const [logModal, setLogModal] = useState(false);
  const [status, setStatus] = useState(todayLog?.status || 'complete');
  const [partialPct, setPartialPct] = useState(todayLog?.partial_pct || 50);
  const [eMedici, setEMedici] = useState(todayLog?.e_medici || 0);
  const [saving, setSaving] = useState(false);

  // Quick question log fields in modal
  const [qSubjectId, setQSubjectId] = useState('');
  const [qDone, setQDone] = useState(0);
  const [qCorrect, setQCorrect] = useState(0);
  const [qSaving, setQSaving] = useState(false);

  function openModal() {
    setStatus(todayLog?.status || 'complete');
    setPartialPct(todayLog?.partial_pct || 50);
    setEMedici(todayLog?.e_medici || 0);
    setQDone(0);
    setQCorrect(0);
    setQSubjectId('');
    setLogModal(true);
  }

  async function handleSaveLog() {
    setSaving(true);
    const taskId = todayLog?.task_id || task?.id;
    const taskNum = todayLog?.task_num ?? (task?.sort_order || nextTask?.sort_order);
    await upsertLog({
      date: todayStr,
      status,
      task_num: taskNum,
      task_id: taskId,
      e_medici: eMedici,
      partial_pct: partialPct,
      blocks,
      note: '',
    });
    // Quick-log questions if filled in
    if (qDone > 0 && addQuestionLog) {
      setQSaving(true);
      await addQuestionLog({
        date: todayStr,
        questions_done: qDone,
        correct_count: qCorrect,
        subject_id: qSubjectId || null,
      });
      setQSaving(false);
    }
    setSaving(false);
    setLogModal(false);
  }

  async function handleClearEntry() {
    if (!todayLog) return;
    setSaving(true);
    await deleteLog(todayStr);
    setSaving(false);
    setLogModal(false);
  }

  function saveBlocksDebounced(updated) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const taskNum = todayLog?.task_num ?? (task?.sort_order || 1);
      const taskId = todayLog?.task_id || task?.id;
      if (todayLog) {
        await updateBlocks(todayStr, updated);
      } else {
        await upsertLog({ date: todayStr, status: 'pending', task_num: taskNum, task_id: taskId, blocks: updated, e_medici: 0 });
      }
    }, 1000);
  }

  function handleBlockToggle(idx) {
    const updated = blocks.map((b, i) => i === idx ? { ...b, done: !b.done } : b);
    setBlocks(updated);
    saveBlocksDebounced(updated);
  }

  function handleBlockNote(idx, note) {
    const updated = blocks.map((b, i) => i === idx ? { ...b, note } : b);
    setBlocks(updated);
    saveBlocksDebounced(updated);
  }

  function addBlock() {
    const updated = [...blocks, { label: `Block ${blocks.length + 1}`, time: 'Custom', done: false, note: '' }];
    setBlocks(updated);
    if (todayLog) updateBlocks(todayStr, updated);
  }

  const blocksDone = blocks.filter(b => b.done).length;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-[#0F172A]">{formatDisplay(new Date())}</h1>
        <p className="font-sans text-[#64748B] text-sm mt-1">
          {scheduleTemplateName} · {blocks.length} blocks scheduled
        </p>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        {/* Left — Study Blocks */}
        <div className="flex flex-col gap-4">
          {/* Task info */}
          {task && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs text-[#94A3B8]">#{task.sort_order || task.id}</span>
                <Badge variant={task.phase === 1 ? 'blue' : task.phase === 2 ? 'purple' : 'green'}>Phase {task.phase}</Badge>
                {(task.is_milestone || task.isMilestone) && <Badge variant="amber">Milestone</Badge>}
              </div>
              <p className="font-serif text-lg text-[#0F172A]">{task.title}</p>
              <p className="font-sans text-sm text-[#64748B] mt-1">
                {task.subject} · Target {task.emedici_qty || task.eQty} {qbName}
              </p>
            </Card>
          )}

          {/* SR alert */}
          {srDue.length > 0 && (
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px] px-4 py-3">
              <p className="font-sans text-sm font-semibold text-[#B45309]">
                {srDue.length} SR review{srDue.length > 1 ? 's' : ''} due today:
                {srDue.map(s => ` ${s.subject_name} (${s.label})`).join(',')}
              </p>
            </div>
          )}

          {/* Progress */}
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="font-sans text-sm text-[#64748B]">Blocks Complete</span>
              <span className="font-mono text-sm text-[#334155]">{blocksDone}/{blocks.length}</span>
            </div>
            <ProgressBar value={blocksDone} max={blocks.length || 1} color="#0F2744" />
          </div>

          {/* Blocks list */}
          <div className="flex flex-col gap-2">
            {blocks.map((block, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-[10px] border transition-all ${
                  block.done ? 'bg-[#ECFDF5] border-[#A7F3D0]' : 'bg-white border-[#E2E8F0]'
                }`}
              >
                <button onClick={() => handleBlockToggle(i)} className="mt-0.5 cursor-pointer text-[#64748B] hover:text-[#10B981] flex-shrink-0">
                  {block.done ? <CheckSquare size={18} className="text-[#10B981]" /> : <Square size={18} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-sans text-sm font-semibold text-[#334155]">{block.label}</span>
                    <span className="font-mono text-xs text-[#94A3B8]">{block.time}</span>
                  </div>
                  <input
                    type="text"
                    value={block.note}
                    onChange={e => handleBlockNote(i, e.target.value)}
                    placeholder="What did you study?"
                    className="w-full font-sans text-sm text-[#64748B] bg-transparent outline-none placeholder-[#CBD5E1]"
                  />
                </div>
              </div>
            ))}
          </div>

          <Button variant="secondary" onClick={addBlock} className="self-start">
            <Plus size={16} /> Add Block
          </Button>
        </div>

        {/* Right — sticky sidebar */}
        <div className="flex flex-col gap-4 sticky top-6 self-start">
          <PomodoroTimer />

          <Button onClick={openModal} size="lg" className="w-full justify-center">
            {todayLog ? "Edit Today's Log" : 'Log Today'}
          </Button>

          {/* Quick stats */}
          <Card className="p-4">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-3">Quick Stats</h3>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Blocks Done',         value: `${blocksDone}/${blocks.length}` },
                { label: 'Task #',              value: task?.sort_order ?? task?.id ?? '—' },
                { label: `${qbName} Target`,    value: task?.emedici_qty || task?.eQty || '—' },
                { label: `${qbName} Done`,      value: todayLog?.e_medici ?? 0 },
                { label: 'Deficit',             value: deficit },
              ].map(s => (
                <div key={s.label} className="flex justify-between">
                  <span className="font-sans text-sm text-[#64748B]">{s.label}</span>
                  <span className="font-mono text-sm font-bold text-[#0F172A]">{s.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Log Modal */}
      <Modal open={logModal} onClose={() => setLogModal(false)} title="Log Today's Study">
        <div className="flex flex-col gap-5">
          {/* Status */}
          <div>
            <label className="font-sans text-xs font-bold uppercase tracking-wider text-[#64748B] block mb-2">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setStatus(opt.key)}
                  className={`py-2.5 px-3 rounded-[10px] border-2 font-sans text-sm font-semibold transition-all cursor-pointer text-left flex items-center gap-2 ${
                    status === opt.key ? 'border-current text-white' : 'border-[#E2E8F0] text-[#334155] hover:border-[#CBD5E1]'
                  }`}
                  style={status === opt.key ? { backgroundColor: opt.color, borderColor: opt.color } : {}}
                >
                  <span>{opt.icon}</span> {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Partial % */}
          {status === 'partial' && (
            <div>
              <label className="font-sans text-xs font-bold uppercase tracking-wider text-[#64748B] block mb-2">
                Completion — {partialPct}%
              </label>
              <input type="range" min="10" max="90" step="10" value={partialPct}
                onChange={e => setPartialPct(+e.target.value)}
                className="w-full accent-[#F59E0B]" />
            </div>
          )}

          {/* Question bank */}
          {(status === 'complete' || status === 'partial') && (
            <div>
              <label className="font-sans text-xs font-bold uppercase tracking-wider text-[#64748B] block mb-2">
                {qbName} Questions Done
              </label>
              <input type="number" min="0" value={eMedici} onChange={e => setEMedici(+e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-[10px] px-3 py-2.5 font-mono text-sm outline-none focus:border-[#3B82F6]" />
            </div>
          )}

          {/* Quick Question Log */}
          {addQuestionLog && (status === 'complete' || status === 'partial') && (
            <div className="border border-[#E2E8F0] rounded-[10px] p-4 flex flex-col gap-3">
              <p className="font-sans text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Log Questions (optional)
              </p>
              {subjects.length > 0 && (
                <div>
                  <label className="font-sans text-xs text-[#94A3B8] block mb-1">Subject</label>
                  <select
                    value={qSubjectId}
                    onChange={e => setQSubjectId(e.target.value)}
                    className="w-full border border-[#E2E8F0] rounded-[8px] px-3 py-2 font-sans text-sm outline-none focus:border-[#3B82F6]"
                  >
                    <option value="">Any / Mixed</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-sans text-xs text-[#94A3B8] block mb-1">Questions Done</label>
                  <input type="number" min="0" value={qDone} onChange={e => setQDone(+e.target.value)}
                    className="w-full border border-[#E2E8F0] rounded-[8px] px-3 py-2 font-mono text-sm outline-none focus:border-[#3B82F6]" />
                </div>
                <div>
                  <label className="font-sans text-xs text-[#94A3B8] block mb-1">Correct</label>
                  <input type="number" min="0" max={qDone} value={qCorrect} onChange={e => setQCorrect(+e.target.value)}
                    className="w-full border border-[#E2E8F0] rounded-[8px] px-3 py-2 font-mono text-sm outline-none focus:border-[#3B82F6]" />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSaveLog} disabled={saving || qSaving} className="flex-1">
              {saving ? 'Saving…' : 'Save Log'}
            </Button>
            {todayLog && (
              <Button variant="danger" onClick={handleClearEntry} disabled={saving}>
                Clear Entry
              </Button>
            )}
            <Button variant="secondary" onClick={() => setLogModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
