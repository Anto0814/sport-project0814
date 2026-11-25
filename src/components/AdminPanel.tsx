import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/workout';
import { formatDateFr } from '../utils/format';

export function AdminPanel() {
  const [accounts, setAccounts] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [query, setQuery] = useState('');

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, username_normalized, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMsg("Impossible de charger la liste des comptes.");
    } else {
      setAccounts((data ?? []) as UserProfile[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.username.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q)
    );
  }, [accounts, query]);

  const adminCount = accounts.filter((a) => a.role === 'admin').length;
  const userCount = accounts.length - adminCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Accès Administrateur
          </span>
          <h1 className="font-display mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Gestion des comptes
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Vue d&apos;ensemble de tous les comptes StreetFlow créés sur Supabase.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAccounts}
          disabled={loading}
          className="btn-secondary px-4 py-2.5 text-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="surface-card p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Users className="h-3.5 w-3.5 text-cyan-500" />
            Total comptes
          </div>
          <div className="font-display mt-1 text-3xl font-bold tabular-nums">
            {accounts.length}
          </div>
        </div>
        <div className="surface-card p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <User className="h-3.5 w-3.5 text-emerald-500" />
            Utilisateurs
          </div>
          <div className="font-display mt-1 text-3xl font-bold tabular-nums text-emerald-500">
            {userCount}
          </div>
        </div>
        <div className="surface-card p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
            Admins
          </div>
          <div className="font-display mt-1 text-3xl font-bold tabular-nums text-amber-500">
            {adminCount}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un pseudo..."
          className="input-field pl-10"
        />
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Accounts list */}
      <div className="surface-card overflow-hidden">
        {loading && accounts.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
            Chargement des comptes...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Aucun compte trouvé.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {filtered.map((acc) => {
              const isRoleAdmin = acc.role === 'admin';
              const initial = acc.username.slice(0, 2).toUpperCase();
              return (
                <div
                  key={acc.id}
                  className="flex flex-col justify-between gap-3 p-4 transition hover:bg-slate-50/70 sm:flex-row sm:items-center dark:hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
                        isRoleAdmin
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950'
                          : 'bg-gradient-to-br from-cyan-400/20 to-emerald-400/20 text-cyan-700 dark:text-cyan-300'
                      }`}
                    >
                      {initial}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-base font-bold">
                          {acc.username}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                            isRoleAdmin
                              ? 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                              : 'border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                          }`}
                        >
                          {isRoleAdmin ? 'Admin' : 'Utilisateur'}
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                        ID : {acc.id.slice(0, 8)}…
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <Calendar className="h-3.5 w-3.5 text-cyan-500" />
                    Créé le {formatDateFr(acc.created_at)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
