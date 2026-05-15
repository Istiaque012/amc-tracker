import { supabase } from './supabase';

const CACHE_KEY = 'amc_ai_advisor_cache';
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

function getCached() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { advice, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return advice;
  } catch {
    return null;
  }
}

function setCache(advice) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ advice, timestamp: Date.now() }));
  } catch {
    // localStorage full — ignore
  }
}

export function clearAdvisorCache() {
  localStorage.removeItem(CACHE_KEY);
}

export async function getStudyAdvice(userId, { forceRefresh = false } = {}) {
  // Check cache first
  if (!forceRefresh) {
    const cached = getCached();
    if (cached) return { advice: cached, fromCache: true };
  }

  // 1. Fetch study data via the Supabase RPC function
  const { data: studyData, error: rpcError } = await supabase.rpc('get_ai_advisor_data', {
    p_user_id: userId,
  });

  if (rpcError) {
    console.error('[aiAdvisor] RPC error:', rpcError);
    throw new Error(`Failed to fetch study data: ${rpcError.message}`);
  }

  // 2. Call our serverless proxy
  const apiUrl = import.meta.env.DEV ? '/api/ai-advisor' : '/api/ai-advisor';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studyData }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `AI advisor request failed (${response.status})`);
  }

  const { advice } = await response.json();
  setCache(advice);
  return { advice, fromCache: false };
}
