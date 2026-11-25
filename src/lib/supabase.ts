import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://cuqvijlzoqrgaargbbvx.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_qMNjdeZ3OqHcOVKb7QfhDw_8TrApYzn';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'streetflow_supabase_auth_v1',
  },
});

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function buildInternalEmail(username: string): string {
  return `${normalizeUsername(username)}@users.streetflow.app`;
}

export function buildInternalPassword(pin: string): string {
  return `sf_v1_pin_${pin.trim()}_lock`;
}
