import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setMessage('');
    setLoading(true);
    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    } else {
      const { error } = await signUp(email, password);
      if (error) setError(error.message);
      else setMessage('Check your email to confirm your account, then log in.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl text-[#0F2744] mb-2">AMC Tracker</h1>
          <p className="font-sans text-[#64748B] text-sm">Study smarter. Pass with confidence.</p>
        </div>

        <div className="bg-white rounded-[14px] border border-[#E2E8F0] shadow-sm p-6">
          <div className="flex rounded-[10px] border border-[#E2E8F0] p-1 mb-6">
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setMessage(''); }}
                className={`flex-1 py-2 rounded-[8px] font-sans text-sm font-semibold capitalize transition-all cursor-pointer ${
                  mode === m ? 'bg-[#0F2744] text-white' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="font-sans text-xs font-bold uppercase tracking-wider text-[#64748B] block mb-1.5">Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-[10px] px-3 py-2.5 font-sans text-sm text-[#0F172A] outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#BFDBFE] transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="font-sans text-xs font-bold uppercase tracking-wider text-[#64748B] block mb-1.5">Password</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-[10px] px-3 py-2.5 font-sans text-sm text-[#0F172A] outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#BFDBFE] transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="font-sans text-sm text-[#EF4444] bg-[#FEF2F2] px-3 py-2 rounded-[8px]">{error}</p>}
            {message && <p className="font-sans text-sm text-[#059669] bg-[#ECFDF5] px-3 py-2 rounded-[8px]">{message}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 rounded-[10px] bg-[#0F2744] text-white font-sans font-semibold text-sm hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Loading…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center font-sans text-xs text-[#94A3B8] mt-6">
          AMC MCQ Exam — August 17, 2026
        </p>
      </div>
    </div>
  );
}
