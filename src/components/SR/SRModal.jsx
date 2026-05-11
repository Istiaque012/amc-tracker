import { useState } from 'react';
import Modal from '../Common/Modal';
import Button from '../Common/Button';

const RATINGS = [
  { key: 'blackout', label: 'Blackout', desc: 'Complete blank — no recall', color: '#EF4444', next: '3 days' },
  { key: 'hard',     label: 'Hard',     desc: 'Recalled with significant effort', color: '#F97316', next: '7 days' },
  { key: 'medium',   label: 'Medium',   desc: 'Got it with some hesitation', color: '#F59E0B', next: '14 days' },
  { key: 'easy',     label: 'Easy',     desc: 'Recalled instantly and confidently', color: '#10B981', next: '21 days' },
];

export default function SRModal({ open, onClose, subjectName, hitLabel, onSave, loading }) {
  const [rating, setRating] = useState(null);

  function handleSave() {
    if (!rating) return;
    onSave(rating);
    setRating(null);
  }

  function handleClose() {
    setRating(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={`${subjectName} — ${hitLabel}`}>
      <p className="font-sans text-sm text-[#64748B] mb-4">How well did you recall this subject?</p>
      <div className="flex flex-col gap-2 mb-6">
        {RATINGS.map(r => (
          <button
            key={r.key}
            onClick={() => setRating(r.key)}
            className={`w-full text-left p-3 rounded-[10px] border-2 transition-all cursor-pointer ${
              rating === r.key ? 'border-current' : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
            }`}
            style={rating === r.key ? { borderColor: r.color, backgroundColor: `${r.color}10` } : {}}
          >
            <div className="flex justify-between items-center">
              <div>
                <span className="font-sans font-bold text-sm" style={{ color: r.color }}>{r.label}</span>
                <span className="font-sans text-sm text-[#64748B] ml-2">— {r.desc}</span>
              </div>
              <span className="font-mono text-xs text-[#94A3B8]">Next in {r.next}</span>
            </div>
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={!rating || loading} className="flex-1">
          {loading ? 'Saving…' : 'Mark Complete'}
        </Button>
        <Button variant="secondary" onClick={handleClose}>Cancel</Button>
      </div>
    </Modal>
  );
}
