import { useState, useEffect } from 'react';
import { Brain, RefreshCw, AlertTriangle, CheckCircle, ArrowRight, Calendar, Target, Zap } from 'lucide-react';
import Card from '../Common/Card';
import Badge from '../Common/Badge';
import Button from '../Common/Button';
import { getStudyAdvice, clearAdvisorCache } from '../../lib/aiAdvisor';

const URGENCY_COLORS = {
  high: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', badge: 'red' },
  medium: { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', badge: 'amber' },
  low: { bg: '#ECFDF5', border: '#A7F3D0', text: '#059669', badge: 'green' },
};

export default function AIAdvisor({ userId }) {
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(false);

  async function fetchAdvice(forceRefresh = false) {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getStudyAdvice(userId, { forceRefresh });
      setAdvice(result.advice);
      setFromCache(result.fromCache);
    } catch (err) {
      console.error('[AIAdvisor] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAdvice();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!userId) return null;

  return (
    <Card className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-[8px] bg-[#F5F3FF]">
            <Brain size={18} className="text-[#7C3AED]" />
          </div>
          <div>
            <h3 className="font-sans text-sm font-bold text-[#0F172A]">AI Study Advisor</h3>
            {fromCache && !loading && (
              <span className="font-sans text-[10px] text-[#94A3B8]">Cached result</span>
            )}
          </div>
        </div>
        <button
          onClick={() => { clearAdvisorCache(); fetchAdvice(true); }}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-1 rounded-[8px] font-sans text-xs font-semibold text-[#7C3AED] hover:bg-[#F5F3FF] disabled:opacity-50 cursor-pointer transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Thinking...' : 'Refresh'}
        </button>
      </div>

      {/* Loading state */}
      {loading && !advice && (
        <div className="flex flex-col items-center py-8 gap-3">
          <RefreshCw size={24} className="text-[#7C3AED] animate-spin" />
          <p className="font-sans text-sm text-[#64748B]">Analyzing your study data...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex items-start gap-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] px-4 py-3">
          <AlertTriangle size={16} className="text-[#DC2626] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-sans text-sm text-[#DC2626] font-semibold">Unable to get advice</p>
            <p className="font-sans text-xs text-[#DC2626] mt-1">{error}</p>
            <button
              onClick={() => fetchAdvice(true)}
              className="font-sans text-xs font-semibold text-[#DC2626] underline mt-2 cursor-pointer"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Advice content */}
      {advice && !loading && (
        <div className="flex flex-col gap-4">
          {/* Assessment */}
          <div className="bg-[#F8FAFC] rounded-[10px] p-3">
            <p className="font-sans text-sm text-[#334155] leading-relaxed">{advice.assessment}</p>
          </div>

          {/* Achievable badge */}
          {advice.achievable !== undefined && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-[10px] ${
              advice.achievable ? 'bg-[#ECFDF5] border border-[#A7F3D0]' : 'bg-[#FFFBEB] border border-[#FDE68A]'
            }`}>
              {advice.achievable ? (
                <>
                  <CheckCircle size={16} className="text-[#059669]" />
                  <span className="font-sans text-sm font-semibold text-[#059669]">Goal looks achievable at current pace</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={16} className="text-[#B45309]" />
                  <span className="font-sans text-sm font-semibold text-[#B45309]">Needs adjustment to stay on track</span>
                </>
              )}
            </div>
          )}

          {/* Priorities */}
          {advice.priorities?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target size={14} className="text-[#64748B]" />
                <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#64748B]">Priorities</span>
              </div>
              <div className="flex flex-col gap-2">
                {advice.priorities.map((p, i) => {
                  const colors = URGENCY_COLORS[p.urgency] || URGENCY_COLORS.medium;
                  return (
                    <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-[8px] border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                      <Badge variant={colors.badge} className="mt-0.5 shrink-0">{p.urgency}</Badge>
                      <div className="min-w-0">
                        <span className="font-sans text-sm font-semibold" style={{ color: colors.text }}>{p.title}</span>
                        <p className="font-sans text-xs text-[#64748B] mt-0.5">{p.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Weekly Plan */}
          {advice.weeklyPlan?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={14} className="text-[#64748B]" />
                <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#64748B]">Suggested Weekly Plan</span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {advice.weeklyPlan.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] hover:bg-[#F8FAFC]">
                    <span className="font-sans text-xs font-bold text-[#94A3B8] w-16 shrink-0">{d.day?.slice(0, 3)}</span>
                    <ArrowRight size={10} className="text-[#CBD5E1] shrink-0" />
                    <span className="font-sans text-sm text-[#334155]">{d.focus}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Smart Reschedule */}
          {advice.reschedule && (
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[10px] p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-[#1D4ED8]" />
                <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#1D4ED8]">Smart Reschedule</span>
              </div>
              <p className="font-sans text-sm text-[#334155]">{advice.reschedule}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
