import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { DEFAULT_SETTINGS } from '../lib/defaultSeedData';

export function useUserSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    if (!user) { setSettings(null); setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (err) {
      // Table may not exist yet — return defaults gracefully
      setSettings({ ...DEFAULT_SETTINGS, user_id: user.id });
      setError('migration_required');
    } else {
      setSettings(data || { ...DEFAULT_SETTINGS, user_id: user.id });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  async function updateSettings(updates) {
    if (!user || !settings) return;
    const { error: err } = await supabase
      .from('user_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    if (!err) await fetchSettings();
    return { error: err };
  }

  return { settings: settings || DEFAULT_SETTINGS, loading, error, updateSettings, refetch: fetchSettings };
}
