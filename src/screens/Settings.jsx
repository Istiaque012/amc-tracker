import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Save, Download, Upload, AlertTriangle, RefreshCw } from 'lucide-react';
import Card from '../components/Common/Card';
import Badge from '../components/Common/Badge';
import Button from '../components/Common/Button';
import Modal from '../components/Common/Modal';
import { useUserSettings } from '../hooks/useUserSettings';
import { useSubjects } from '../hooks/useSubjects';
import { useTasks } from '../hooks/useTasks';
import { usePhases } from '../hooks/usePhases';
import { useScheduleTemplates } from '../hooks/useScheduleTemplates';
import { useAuth } from '../hooks/useAuth';
import { daysUntilExam } from '../lib/dateUtils';
import { forceReseed } from '../lib/seedUserData';

const TABS = ['Exam Setup', 'Subjects', 'Tasks', 'SR Settings', 'Schedule', 'Phases', 'Import/Export'];

const BLUEPRINT_CATEGORIES = [
  'Adult Medicine', 'Adult Surgery', "Women's Health", 'Child Health',
  'Mental Health', 'Population Health', 'Ethics', 'Statistics', 'Other',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Field row helper ─────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-sans text-xs font-bold uppercase tracking-wider text-[#64748B]">{label}</label>
      {children}
    </div>
  );
}
function Input({ value, onChange, type = 'text', min, max, step, placeholder }) {
  return (
    <input type={type} value={value ?? ''} onChange={onChange} min={min} max={max} step={step} placeholder={placeholder}
      className="border border-[#E2E8F0] rounded-[10px] px-3 py-2.5 font-sans text-sm text-[#0F172A] outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#BFDBFE] transition-all w-full" />
  );
}
function Select({ value, onChange, options }) {
  return (
    <select value={value ?? ''} onChange={onChange}
      className="border border-[#E2E8F0] rounded-[10px] px-3 py-2.5 font-sans text-sm text-[#0F172A] outline-none focus:border-[#3B82F6] w-full bg-white">
      {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  );
}

// ── Tab: Exam Setup ──────────────────────────────────────────────────────────
function ExamSetupTab({ settings, updateSettings, tasks }) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setForm(settings); }, [settings]);

  const f = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));
  const fi = (key) => (e) => setForm(p => ({ ...p, [key]: parseInt(e.target.value) || 0 }));

  async function handleSave() {
    setSaving(true);
    await updateSettings(form);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const daysLeft = form.exam_date ? daysUntilExam(form.exam_date) : 0;
  const totalTasks = tasks.length || 77;

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h3 className="font-serif text-lg text-[#0F172A] mb-4">Exam Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Exam Name"><Input value={form.exam_name} onChange={f('exam_name')} /></Field>
          <Field label="Question Bank Name"><Input value={form.question_bank_name} onChange={f('question_bank_name')} /></Field>
          <Field label="Exam Date"><Input type="date" value={form.exam_date} onChange={f('exam_date')} /></Field>
          <Field label="Study Start Date"><Input type="date" value={form.study_start_date} onChange={f('study_start_date')} /></Field>
          <Field label="Rest Days Per Month"><Input type="number" min="0" max="20" value={form.rest_days_per_month} onChange={fi('rest_days_per_month')} /></Field>
          <Field label="Daily Question Target"><Input type="number" min="0" value={form.daily_question_target} onChange={fi('daily_question_target')} /></Field>
        </div>
        <div className="mt-5">
          <Button onClick={handleSave} disabled={saving}>
            <Save size={14} /> {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>
      </Card>

      <Card className="p-5 bg-[#EFF6FF] border-[#BFDBFE]">
        <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-[#1D4ED8] mb-3">Preview</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Days to Exam', value: daysLeft },
            { label: 'Total Tasks', value: totalTasks },
            { label: 'Tasks/Week needed', value: daysLeft > 0 ? Math.ceil((totalTasks / (daysLeft / 7)) * 10) / 10 : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="font-mono text-2xl font-bold text-[#0F2744]">{value}</div>
              <div className="font-sans text-xs text-[#64748B] mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Tab: Subjects ────────────────────────────────────────────────────────────
function SubjectsTab({ subjects, addSubject, updateSubject, deleteSubject, reorderSubject }) {
  const [addModal, setAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', blueprint_category: 'Adult Medicine', class_count: 1, emedici_target: 40, tier: 2, sr_hits: 2 });
  const [editForm, setEditForm] = useState({});

  function f(key) { return (e) => setForm(p => ({ ...p, [key]: e.target.value })); }
  function ef(key) { return (e) => setEditForm(p => ({ ...p, [key]: e.target.value })); }

  async function handleAdd() {
    setSaving(true);
    await addSubject({ ...form, class_count: +form.class_count, emedici_target: +form.emedici_target, tier: +form.tier, sr_hits: +form.sr_hits });
    setSaving(false); setAddModal(false);
    setForm({ name: '', blueprint_category: 'Adult Medicine', class_count: 1, emedici_target: 40, tier: 2, sr_hits: 2 });
  }

  async function handleSaveEdit(id) {
    await updateSubject(id, { ...editForm, class_count: +editForm.class_count, emedici_target: +editForm.emedici_target, tier: +editForm.tier, sr_hits: +editForm.sr_hits });
    setEditId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-sans text-sm text-[#64748B]">{subjects.length} subjects</p>
        <Button onClick={() => setAddModal(true)} size="sm"><Plus size={14} /> Add Subject</Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              {['#', 'Name', 'Category', 'Classes', 'eMedici Target', 'Tier', 'SR Hits', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-sans text-xs font-bold uppercase tracking-wider text-[#94A3B8]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subjects.map((sub, idx) => (
              <tr key={sub.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                <td className="px-4 py-2 font-mono text-xs text-[#94A3B8]">{sub.sort_order}</td>
                <td className="px-4 py-2">
                  {editId === sub.id ? (
                    <Input value={editForm.name} onChange={ef('name')} />
                  ) : (
                    <span className="font-sans text-sm font-semibold text-[#0F172A]">{sub.name}</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {editId === sub.id ? (
                    <Select value={editForm.blueprint_category} onChange={ef('blueprint_category')} options={BLUEPRINT_CATEGORIES} />
                  ) : (
                    <span className="font-sans text-xs text-[#64748B]">{sub.blueprint_category}</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {editId === sub.id ? (
                    <Input type="number" min="1" value={editForm.class_count} onChange={ef('class_count')} />
                  ) : (
                    <span className="font-mono text-sm text-[#64748B]">{sub.class_count}</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {editId === sub.id ? (
                    <Input type="number" min="0" value={editForm.emedici_target} onChange={ef('emedici_target')} />
                  ) : (
                    <span className="font-mono text-sm text-[#64748B]">{sub.emedici_target}</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {editId === sub.id ? (
                    <Select value={editForm.tier} onChange={ef('tier')} options={[{value:'1',label:'Tier 1'},{value:'2',label:'Tier 2'},{value:'3',label:'Tier 3'}]} />
                  ) : (
                    <Badge variant={sub.tier === 1 ? 'blue' : sub.tier === 2 ? 'amber' : 'gray'}>T{sub.tier}</Badge>
                  )}
                </td>
                <td className="px-4 py-2">
                  {editId === sub.id ? (
                    <Select value={editForm.sr_hits} onChange={ef('sr_hits')} options={[{value:'1',label:'1'},{value:'2',label:'2'},{value:'3',label:'3'}]} />
                  ) : (
                    <span className="font-mono text-sm text-[#64748B]">{sub.sr_hits}</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    {editId === sub.id ? (
                      <>
                        <Button size="sm" onClick={() => handleSaveEdit(sub.id)}>Save</Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => reorderSubject(sub.id, 'up')} disabled={idx === 0} className="p-1 hover:bg-[#F1F5F9] rounded cursor-pointer disabled:opacity-30"><ChevronUp size={14} /></button>
                        <button onClick={() => reorderSubject(sub.id, 'down')} disabled={idx === subjects.length - 1} className="p-1 hover:bg-[#F1F5F9] rounded cursor-pointer disabled:opacity-30"><ChevronDown size={14} /></button>
                        <button onClick={() => { setEditId(sub.id); setEditForm({ name: sub.name, blueprint_category: sub.blueprint_category, class_count: sub.class_count, emedici_target: sub.emedici_target, tier: sub.tier, sr_hits: sub.sr_hits }); }}
                          className="p-1 hover:bg-[#EFF6FF] rounded text-[#3B82F6] cursor-pointer text-xs font-sans font-semibold px-2">Edit</button>
                        <button onClick={() => setDeleteConfirm(sub.id)} className="p-1 hover:bg-[#FEF2F2] rounded text-[#EF4444] cursor-pointer"><Trash2 size={13} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Add Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Subject">
        <div className="flex flex-col gap-4">
          <Field label="Subject Name"><Input value={form.name} onChange={f('name')} placeholder="e.g. Neurology" /></Field>
          <Field label="Blueprint Category">
            <Select value={form.blueprint_category} onChange={f('blueprint_category')} options={BLUEPRINT_CATEGORIES} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Number of Classes"><Input type="number" min="1" value={form.class_count} onChange={f('class_count')} /></Field>
            <Field label="eMedici Target"><Input type="number" min="0" value={form.emedici_target} onChange={f('emedici_target')} /></Field>
            <Field label="Tier">
              <Select value={form.tier} onChange={f('tier')} options={[{value:'1',label:'Tier 1 (3 SR hits)'},{value:'2',label:'Tier 2 (2 SR hits)'},{value:'3',label:'Tier 3 (1 SR hit)'}]} />
            </Field>
            <Field label="SR Hits">
              <Select value={form.sr_hits} onChange={f('sr_hits')} options={[{value:'1',label:'1'},{value:'2',label:'2'},{value:'3',label:'3'}]} />
            </Field>
          </div>
          <p className="font-sans text-xs text-[#64748B] bg-[#F8FAFC] rounded-[8px] p-2">
            Tasks will be auto-generated: {form.class_count} class task(s) + 1 milestone consolidation task.
          </p>
          <div className="flex gap-3">
            <Button onClick={handleAdd} disabled={saving || !form.name} className="flex-1">{saving ? 'Adding…' : 'Add Subject'}</Button>
            <Button variant="secondary" onClick={() => setAddModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Subject?">
        <div className="flex flex-col gap-4">
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-[#EF4444] mt-0.5 flex-shrink-0" />
            <p className="font-sans text-sm text-[#DC2626]">
              Deleting this subject will also delete its tasks and SR records. Question and mistake logs will lose the subject link. This cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="danger" onClick={async () => { await deleteSubject(deleteConfirm); setDeleteConfirm(null); }}>Delete Subject</Button>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Tab: Tasks ───────────────────────────────────────────────────────────────
function TasksTab({ tasks, subjects, phases, addTask, updateTask, deleteTask, reorderTask }) {
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('All');
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ title: '', phase: 1, emedici_qty: 0, is_milestone: false });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const ef = (key) => (e) => setEditForm(p => ({ ...p, [key]: e.target.value }));
  const af = (key) => (e) => setAddForm(p => ({ ...p, [key]: e.target.value }));

  const filtered = tasks.filter(t => {
    if (phaseFilter !== 'All' && t.phase !== parseInt(phaseFilter)) return false;
    if (search) return t.title.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-[#F1F5F9] p-1 rounded-[10px]">
          {['All','1','2','3'].map(f => (
            <button key={f} onClick={() => setPhaseFilter(f)}
              className={`px-3 py-1.5 rounded-[8px] font-sans text-sm font-semibold transition-all cursor-pointer ${phaseFilter === f ? 'bg-white text-[#0F2744] shadow-sm' : 'text-[#64748B]'}`}>
              {f === 'All' ? 'All' : `Phase ${f}`}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
          className="border border-[#E2E8F0] rounded-[10px] px-3 py-2 font-sans text-sm outline-none focus:border-[#3B82F6] flex-1 max-w-xs" />
        <span className="font-sans text-sm text-[#94A3B8] ml-auto">{filtered.length} tasks</span>
        <Button size="sm" onClick={() => setAddModal(true)}><Plus size={14} /> Add Task</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                {['#', 'Title', 'Phase', 'eMedici', 'Flags', ''].map(h => (
                  <th key={h} className="px-3 py-3 text-left font-sans text-xs font-bold uppercase tracking-wider text-[#94A3B8]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((task, idx) => {
                const globalIdx = tasks.findIndex(t => t.id === task.id);
                return (
                  <tr key={task.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                    <td className="px-3 py-2 font-mono text-xs text-[#94A3B8]">{task.sort_order}</td>
                    <td className="px-3 py-2 max-w-xs">
                      {editId === task.id ? (
                        <input value={editForm.title} onChange={ef('title')}
                          className="w-full border border-[#E2E8F0] rounded-[8px] px-2 py-1.5 font-sans text-sm outline-none focus:border-[#3B82F6]" />
                      ) : (
                        <span className="font-sans text-sm text-[#0F172A]">{task.title}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editId === task.id ? (
                        <Select value={editForm.phase} onChange={ef('phase')} options={[{value:'1',label:'P1'},{value:'2',label:'P2'},{value:'3',label:'P3'}]} />
                      ) : (
                        <Badge variant={task.phase===1?'blue':task.phase===2?'purple':'green'}>P{task.phase}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editId === task.id ? (
                        <input type="number" min="0" value={editForm.emedici_qty} onChange={ef('emedici_qty')}
                          className="w-16 border border-[#E2E8F0] rounded-[8px] px-2 py-1.5 font-mono text-sm outline-none focus:border-[#3B82F6]" />
                      ) : (
                        <span className="font-mono text-sm text-[#64748B]">{task.emedici_qty}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {task.is_milestone && <Badge variant="amber">M</Badge>}
                        {task.is_mock && <Badge variant="purple">Mock</Badge>}
                        {task.is_custom && <Badge variant="gray">Custom</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {editId === task.id ? (
                          <>
                            <Button size="sm" onClick={async () => { await updateTask(task.id, { title: editForm.title, phase: +editForm.phase, emedici_qty: +editForm.emedici_qty }); setEditId(null); }}>Save</Button>
                            <Button size="sm" variant="secondary" onClick={() => setEditId(null)}>✕</Button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => reorderTask(task.id, 'up')} disabled={globalIdx === 0} className="p-1 hover:bg-[#F1F5F9] rounded cursor-pointer disabled:opacity-30"><ChevronUp size={13} /></button>
                            <button onClick={() => reorderTask(task.id, 'down')} disabled={globalIdx === tasks.length - 1} className="p-1 hover:bg-[#F1F5F9] rounded cursor-pointer disabled:opacity-30"><ChevronDown size={13} /></button>
                            <button onClick={() => { setEditId(task.id); setEditForm({ title: task.title, phase: task.phase, emedici_qty: task.emedici_qty }); }}
                              className="px-2 py-1 hover:bg-[#EFF6FF] rounded text-[#3B82F6] cursor-pointer text-xs font-sans font-semibold">Edit</button>
                            <button onClick={() => setDeleteConfirm(task.id)} className="p-1 hover:bg-[#FEF2F2] rounded text-[#EF4444] cursor-pointer"><Trash2 size={13} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Custom Task">
        <div className="flex flex-col gap-4">
          <Field label="Title"><Input value={addForm.title} onChange={af('title')} placeholder="Task title" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phase">
              <Select value={addForm.phase} onChange={af('phase')} options={[{value:'1',label:'Phase 1'},{value:'2',label:'Phase 2'},{value:'3',label:'Phase 3'}]} />
            </Field>
            <Field label="Question Target"><Input type="number" min="0" value={addForm.emedici_qty} onChange={af('emedici_qty')} /></Field>
          </div>
          <div className="flex gap-3">
            <Button onClick={async () => { await addTask({ ...addForm, phase: +addForm.phase, emedici_qty: +addForm.emedici_qty }); setAddModal(false); setAddForm({ title: '', phase: 1, emedici_qty: 0 }); }} disabled={!addForm.title} className="flex-1">Add Task</Button>
            <Button variant="secondary" onClick={() => setAddModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Task?">
        <div className="flex flex-col gap-4">
          <p className="font-sans text-sm text-[#64748B]">Delete this task? This cannot be undone.</p>
          <div className="flex gap-3">
            <Button variant="danger" onClick={async () => { await deleteTask(deleteConfirm); setDeleteConfirm(null); }}>Delete</Button>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Tab: SR Settings ─────────────────────────────────────────────────────────
function SRSettingsTab({ settings, updateSettings }) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setForm(settings); }, [settings]);

  const f = (key) => (e) => setForm(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }));

  async function handleSave() {
    setSaving(true);
    await updateSettings(form);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const previewEasy = Math.round(21 * (form.sr2_multiplier || 1.5));
  const previewHard = Math.round(7 * (form.sr2_multiplier || 1.5));

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-6">
        <h3 className="font-serif text-lg text-[#0F172A] mb-4">Review Intervals</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="SR1 Interval (days)"><Input type="number" min="1" value={form.sr1_interval} onChange={f('sr1_interval')} /></Field>
          <Field label="Grace Period (days)"><Input type="number" min="0" max="7" value={form.grace_period_days} onChange={f('grace_period_days')} /></Field>
          <Field label="SR2 Multiplier (×SR1 interval)"><Input type="number" min="0.5" max="5" step="0.1" value={form.sr2_multiplier} onChange={f('sr2_multiplier')} /></Field>
          <Field label="SR3 Multiplier (×rating interval)"><Input type="number" min="0.5" max="5" step="0.1" value={form.sr3_multiplier} onChange={f('sr3_multiplier')} /></Field>
        </div>
        <h3 className="font-serif text-lg text-[#0F172A] mt-5 mb-4">SR Hits by Tier</h3>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Tier 1 SR Hits"><Input type="number" min="1" max="3" value={form.tier1_sr_hits} onChange={f('tier1_sr_hits')} /></Field>
          <Field label="Tier 2 SR Hits"><Input type="number" min="1" max="3" value={form.tier2_sr_hits} onChange={f('tier2_sr_hits')} /></Field>
          <Field label="Tier 3 SR Hits"><Input type="number" min="1" max="3" value={form.tier3_sr_hits} onChange={f('tier3_sr_hits')} /></Field>
        </div>
        <Button onClick={handleSave} disabled={saving} className="mt-5">
          <Save size={14} /> {saved ? 'Saved!' : saving ? 'Saving…' : 'Save SR Settings'}
        </Button>
      </Card>
      <Card className="p-5 bg-[#F5F3FF] border-[#DDD6FE]">
        <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-[#7C3AED] mb-3">Preview</h3>
        <div className="flex flex-col gap-2 font-sans text-sm text-[#334155]">
          <p>SR1 due: <strong>{form.sr1_interval} days</strong> after subject completion.</p>
          <p>After SR1 Easy → SR2 due in <strong>~{previewEasy} days</strong> ({form.sr2_multiplier}× easy interval of 21).</p>
          <p>After SR1 Hard → SR2 due in <strong>~{previewHard} days</strong> ({form.sr2_multiplier}× hard interval of 7).</p>
          <p>Grace period: <strong>{form.grace_period_days} days</strong> before overdue flag appears.</p>
        </div>
      </Card>
    </div>
  );
}

// ── Tab: Schedule ────────────────────────────────────────────────────────────
function ScheduleTab({ templates, assignments, createTemplate, updateTemplate, deleteTemplate, assignTemplate }) {
  const [addModal, setAddModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', blocks: [] });
  const [saving, setSaving] = useState(false);

  function templateForDay(dow) {
    const a = assignments.find(a => a.day_of_week === dow);
    return templates.find(t => t.id === a?.template_id) || null;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Day assignments */}
      <Card className="p-5">
        <h3 className="font-serif text-lg text-[#0F172A] mb-4">Day Assignments</h3>
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((day, dow) => {
            const tpl = templateForDay(dow);
            return (
              <div key={dow} className="flex flex-col gap-2">
                <div className="font-sans text-xs font-bold text-center text-[#64748B] uppercase">{day}</div>
                <select value={assignments.find(a => a.day_of_week === dow)?.template_id || ''}
                  onChange={e => assignTemplate(dow, e.target.value || null)}
                  className="border border-[#E2E8F0] rounded-[8px] px-2 py-1.5 font-sans text-xs text-[#334155] outline-none focus:border-[#3B82F6] bg-white">
                  <option value="">None</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {tpl && <span className="font-sans text-xs text-center text-[#64748B]">{tpl.blocks?.length || 0} blocks</span>}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Template list */}
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg text-[#0F172A]">Templates</h3>
        <Button size="sm" onClick={() => setAddModal(true)}><Plus size={14} /> New Template</Button>
      </div>

      {templates.map(tpl => (
        <Card key={tpl.id} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-sans font-bold text-[#0F172A]">{tpl.name}</span>
              {tpl.is_default && <Badge variant="blue">Default</Badge>}
              <span className="font-sans text-xs text-[#94A3B8]">{tpl.blocks?.length || 0} blocks</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditId(tpl.id); setForm({ name: tpl.name, blocks: [...(tpl.blocks || [])] }); }}
                className="font-sans text-xs text-[#3B82F6] hover:underline cursor-pointer">Edit</button>
              <button onClick={() => deleteTemplate(tpl.id)} className="font-sans text-xs text-[#EF4444] hover:underline cursor-pointer">Delete</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(tpl.blocks || []).map((b, i) => (
              <span key={i} className="font-mono text-xs bg-[#F1F5F9] px-2 py-1 rounded-[6px] text-[#64748B]">{b.label} {b.start}–{b.end}</span>
            ))}
          </div>
        </Card>
      ))}

      {/* Add/Edit modal */}
      <Modal open={addModal || !!editId} onClose={() => { setAddModal(false); setEditId(null); }} title={editId ? 'Edit Template' : 'New Template'} width="max-w-2xl">
        <div className="flex flex-col gap-4">
          <Field label="Template Name"><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></Field>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-sans text-xs font-bold uppercase tracking-wider text-[#64748B]">Blocks</label>
              <button onClick={() => setForm(p => ({ ...p, blocks: [...p.blocks, { label: `Block ${p.blocks.length + 1}`, start: '09:00', end: '09:50', type: 'study' }] }))}
                className="font-sans text-xs text-[#3B82F6] hover:underline cursor-pointer">+ Add Block</button>
            </div>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {form.blocks.map((b, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-[#F8FAFC] rounded-[8px]">
                  <input value={b.label} onChange={e => { const bl = [...form.blocks]; bl[i] = { ...bl[i], label: e.target.value }; setForm(p => ({ ...p, blocks: bl })); }}
                    className="border border-[#E2E8F0] rounded-[6px] px-2 py-1 font-sans text-xs outline-none w-20" />
                  <input type="time" value={b.start} onChange={e => { const bl = [...form.blocks]; bl[i] = { ...bl[i], start: e.target.value }; setForm(p => ({ ...p, blocks: bl })); }}
                    className="border border-[#E2E8F0] rounded-[6px] px-2 py-1 font-mono text-xs outline-none" />
                  <span className="text-[#94A3B8] text-xs">–</span>
                  <input type="time" value={b.end} onChange={e => { const bl = [...form.blocks]; bl[i] = { ...bl[i], end: e.target.value }; setForm(p => ({ ...p, blocks: bl })); }}
                    className="border border-[#E2E8F0] rounded-[6px] px-2 py-1 font-mono text-xs outline-none" />
                  <button onClick={() => setForm(p => ({ ...p, blocks: p.blocks.filter((_, j) => j !== i) }))}
                    className="text-[#EF4444] hover:text-[#DC2626] cursor-pointer ml-auto"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={async () => {
              setSaving(true);
              if (editId) await updateTemplate(editId, { name: form.name, blocks: form.blocks });
              else await createTemplate({ name: form.name, blocks: form.blocks });
              setSaving(false); setAddModal(false); setEditId(null);
            }} disabled={saving || !form.name} className="flex-1">{saving ? 'Saving…' : 'Save Template'}</Button>
            <Button variant="secondary" onClick={() => { setAddModal(false); setEditId(null); }}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Tab: Phases ──────────────────────────────────────────────────────────────
function PhasesTab({ phases, tasks, addPhase, updatePhase, deletePhase, reorderPhase }) {
  const [addModal, setAddModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', target_completion_date: '' });
  const [editForm, setEditForm] = useState({});
  const f = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));
  const ef = (key) => (e) => setEditForm(p => ({ ...p, [key]: e.target.value }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-sans text-sm text-[#64748B]">{phases.length} phases</p>
        <Button size="sm" onClick={() => setAddModal(true)}><Plus size={14} /> Add Phase</Button>
      </div>

      {phases.map((phase, idx) => {
        const phaseTasks = tasks.filter(t => t.phase_id === phase.id || t.phase === phase.sort_order);
        return (
          <Card key={phase.id} className="p-4">
            {editId === phase.id ? (
              <div className="flex flex-col gap-3">
                <Field label="Phase Name"><Input value={editForm.name} onChange={ef('name')} /></Field>
                <Field label="Description"><Input value={editForm.description} onChange={ef('description')} /></Field>
                <Field label="Target Completion"><Input type="date" value={editForm.target_completion_date} onChange={ef('target_completion_date')} /></Field>
                <div className="flex gap-2">
                  <Button size="sm" onClick={async () => { await updatePhase(phase.id, editForm); setEditId(null); }}>Save</Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-sans font-bold text-[#0F172A]">{phase.name}</span>
                    <Badge variant="gray">{phaseTasks.length} tasks</Badge>
                    {phase.target_completion_date && <span className="font-mono text-xs text-[#94A3B8]">Target: {phase.target_completion_date}</span>}
                  </div>
                  {phase.description && <p className="font-sans text-sm text-[#64748B]">{phase.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => reorderPhase(phase.id, 'up')} disabled={idx === 0} className="p-1 hover:bg-[#F1F5F9] rounded cursor-pointer disabled:opacity-30"><ChevronUp size={14} /></button>
                  <button onClick={() => reorderPhase(phase.id, 'down')} disabled={idx === phases.length - 1} className="p-1 hover:bg-[#F1F5F9] rounded cursor-pointer disabled:opacity-30"><ChevronDown size={14} /></button>
                  <button onClick={() => { setEditId(phase.id); setEditForm({ name: phase.name, description: phase.description || '', target_completion_date: phase.target_completion_date || '' }); }}
                    className="px-2 py-1 hover:bg-[#EFF6FF] rounded text-[#3B82F6] cursor-pointer text-xs font-sans font-semibold">Edit</button>
                  <button onClick={() => deletePhase(phase.id)} className="p-1 hover:bg-[#FEF2F2] rounded text-[#EF4444] cursor-pointer"><Trash2 size={13} /></button>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Phase">
        <div className="flex flex-col gap-4">
          <Field label="Phase Name"><Input value={form.name} onChange={f('name')} placeholder="e.g. Phase 4 — Extra Revision" /></Field>
          <Field label="Description"><Input value={form.description} onChange={f('description')} /></Field>
          <Field label="Target Completion Date"><Input type="date" value={form.target_completion_date} onChange={f('target_completion_date')} /></Field>
          <div className="flex gap-3">
            <Button onClick={async () => { await addPhase(form); setAddModal(false); setForm({ name: '', description: '', target_completion_date: '' }); }} disabled={!form.name} className="flex-1">Add Phase</Button>
            <Button variant="secondary" onClick={() => setAddModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Tab: Import/Export ───────────────────────────────────────────────────────
function ImportExportTab({ settings, subjects, phases, tasks, templates, user }) {
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  function handleExport() {
    const data = { settings, subjects, phases, tasks, templates, exported_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `amc-tracker-plan-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  }

  function handleImportPreview() {
    try {
      JSON.parse(importText);
      setImportError('');
    } catch {
      setImportError('Invalid JSON. Please paste valid exported plan data.');
    }
  }

  async function handleReset() {
    if (!user?.id) return;
    setResetting(true);
    await forceReseed(user.id);
    setResetting(false);
    setResetConfirm(false);
    setResetDone(true);
    setTimeout(() => setResetDone(false), 4000);
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <h3 className="font-serif text-lg text-[#0F172A] mb-2">Export Plan</h3>
        <p className="font-sans text-sm text-[#64748B] mb-4">Download your settings, subjects, phases, tasks and schedule templates as JSON. Study logs and SR records are not included.</p>
        <Button onClick={handleExport}><Download size={14} /> Export Plan JSON</Button>
      </Card>

      <Card className="p-5">
        <h3 className="font-serif text-lg text-[#0F172A] mb-2">Import Plan</h3>
        <p className="font-sans text-sm text-[#64748B] mb-4">Paste a previously exported plan JSON. This will preview the data — you will need to confirm before any changes are made.</p>
        <textarea value={importText} onChange={e => { setImportText(e.target.value); setImportError(''); }}
          placeholder='{"settings": {...}, "subjects": [...], ...}'
          rows={6}
          className="w-full border border-[#E2E8F0] rounded-[10px] px-3 py-2.5 font-mono text-xs outline-none focus:border-[#3B82F6] resize-none mb-3" />
        {importError && <p className="font-sans text-sm text-[#EF4444] mb-3">{importError}</p>}
        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px] p-3 mb-4">
          <p className="font-sans text-sm text-[#B45309]">⚠️ Import coming in a future update. Export is fully functional.</p>
        </div>
        <Button variant="secondary" onClick={handleImportPreview} disabled><Upload size={14} /> Validate &amp; Import</Button>
      </Card>

      <Card className="p-5 border-[#FECACA]">
        <h3 className="font-serif text-lg text-[#0F172A] mb-2">Reset to Default Data</h3>
        <p className="font-sans text-sm text-[#64748B] mb-4">
          Wipes all your study data (logs, SR records, tasks, subjects, schedule) and re-seeds the default AMC plan. Use this if your data is corrupted or you want a fresh start.
        </p>
        {resetDone && (
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-[10px] p-3 mb-4">
            <p className="font-sans text-sm text-[#065F46]">Reset complete. Reload the page to see fresh data.</p>
          </div>
        )}
        {!resetConfirm ? (
          <Button variant="danger" onClick={() => setResetConfirm(true)}>
            <RefreshCw size={14} /> Reset to Default Data
          </Button>
        ) : (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] p-4 flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-[#EF4444] mt-0.5 flex-shrink-0" />
              <p className="font-sans text-sm text-[#DC2626]">
                This will permanently delete ALL your study logs, SR records, tasks, subjects, and schedule data. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="danger" onClick={handleReset} disabled={resetting}>
                {resetting ? 'Resetting…' : 'Yes, Reset Everything'}
              </Button>
              <Button variant="secondary" onClick={() => setResetConfirm(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Main Settings screen ─────────────────────────────────────────────────────
export default function Settings() {
  const [activeTab, setActiveTab] = useState(0);
  const { user } = useAuth();
  const { settings, updateSettings } = useUserSettings();
  const { subjects, addSubject, updateSubject, deleteSubject, reorderSubject } = useSubjects();
  const { tasks, addTask, updateTask, deleteTask, reorderTask } = useTasks();
  const { phases, addPhase, updatePhase, deletePhase, reorderPhase } = usePhases();
  const { templates, assignments, createTemplate, updateTemplate, deleteTemplate, assignTemplate } = useScheduleTemplates();

  const tabContent = [
    <ExamSetupTab settings={settings} updateSettings={updateSettings} tasks={tasks} />,
    <SubjectsTab subjects={subjects} addSubject={addSubject} updateSubject={updateSubject} deleteSubject={deleteSubject} reorderSubject={reorderSubject} />,
    <TasksTab tasks={tasks} subjects={subjects} phases={phases} addTask={addTask} updateTask={updateTask} deleteTask={deleteTask} reorderTask={reorderTask} />,
    <SRSettingsTab settings={settings} updateSettings={updateSettings} />,
    <ScheduleTab templates={templates} assignments={assignments} createTemplate={createTemplate} updateTemplate={updateTemplate} deleteTemplate={deleteTemplate} assignTemplate={assignTemplate} />,
    <PhasesTab phases={phases} tasks={tasks} addPhase={addPhase} updatePhase={updatePhase} deletePhase={deletePhase} reorderPhase={reorderPhase} />,
    <ImportExportTab settings={settings} subjects={subjects} phases={phases} tasks={tasks} templates={templates} user={user} />,
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-[#0F172A] mb-1">Settings</h1>
        <p className="font-sans text-sm text-[#64748B]">Customise your study plan, subjects, schedule, and SR protocol</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-[#F1F5F9] p-1 rounded-[12px] mb-6 flex-wrap">
        {TABS.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-[10px] font-sans text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === i ? 'bg-white text-[#0F2744] shadow-sm' : 'text-[#64748B] hover:text-[#334155]'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {tabContent[activeTab]}
    </div>
  );
}
