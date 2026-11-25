import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  buildInternalEmail,
  buildInternalPassword,
  normalizeUsername,
  supabase,
} from '../lib/supabase';
import { UserProfile } from '../types/workout';

export interface AuthResult {
  ok: boolean;
  error?: string;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (activeSession: Session | null) => {
    if (!activeSession?.user) {
      setProfile(null);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, username, username_normalized, role, created_at')
      .eq('id', activeSession.user.id)
      .maybeSingle();

    if (data) {
      setProfile(data as UserProfile);
    } else {
      const meta = activeSession.user.app_metadata ?? {};
      const fallbackName =
        typeof meta.username === 'string'
          ? meta.username
          : (activeSession.user.email ?? 'utilisateur').split('@')[0];
      setProfile({
        id: activeSession.user.id,
        username: fallbackName,
        username_normalized: normalizeUsername(fallbackName),
        role: meta.role === 'admin' ? 'admin' : 'user',
        created_at: activeSession.user.created_at ?? new Date().toISOString(),
      });
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (mounted) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      void loadProfile(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(
    async (username: string, pin: string): Promise<AuthResult> => {
      const cleanUser = username.trim();
      if (cleanUser.length < 3) {
        return { ok: false, error: 'Entre un pseudo valide (au moins 3 caractères).' };
      }
      if (!/^\d{4}$/.test(pin)) {
        return { ok: false, error: 'Le code PIN doit contenir exactement 4 chiffres.' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: buildInternalEmail(cleanUser),
        password: buildInternalPassword(pin),
      });

      if (error || !data.session) {
        return { ok: false, error: 'Pseudo ou code PIN incorrect.' };
      }

      setSession(data.session);
      await loadProfile(data.session);
      return { ok: true };
    },
    [loadProfile]
  );

  const signUp = useCallback(
    async (username: string, pin: string): Promise<AuthResult> => {
      const cleanUser = username.trim();
      if (cleanUser.length < 3 || cleanUser.length > 24) {
        return { ok: false, error: 'Le pseudo doit contenir entre 3 et 24 caractères.' };
      }
      if (!/^[a-zA-Z0-9._-]+$/.test(cleanUser)) {
        return {
          ok: false,
          error: 'Caractères autorisés : lettres, chiffres, points, tirets et underscores.',
        };
      }
      if (!/^\d{4}$/.test(pin)) {
        return { ok: false, error: 'Le code PIN doit contenir exactement 4 chiffres.' };
      }

      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'auth-register',
        {
          body: { username: cleanUser, pin },
        }
      );

      if (fnError) {
        // Attempt to read structured JSON error from Edge Function response
        let message = 'Impossible de créer le compte.';
        try {
          const ctx = (fnError as unknown as { context?: Response }).context;
          if (ctx) {
            const parsed = (await ctx.json()) as { error?: string };
            if (parsed?.error) message = parsed.error;
          }
        } catch {
          // Keep default message
        }
        return { ok: false, error: message };
      }

      if (fnData && typeof fnData === 'object' && 'error' in fnData) {
        return { ok: false, error: String((fnData as { error: unknown }).error) };
      }

      return await signIn(cleanUser, pin);
    },
    [signIn]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const isAdmin =
    profile?.role === 'admin' || session?.user?.app_metadata?.role === 'admin';

  return {
    session,
    user: session?.user ?? null,
    profile,
    isAdmin,
    loading,
    signIn,
    signUp,
    signOut,
  };
}
