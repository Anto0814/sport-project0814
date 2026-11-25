import { useMemo, useState } from 'react';
import {
  Activity,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  FileUp,
  Footprints,
  History,
  Layers,
  Route,
  Trash2,
} from 'lucide-react';
import { Discipline, WorkoutSessionLog } from '../types/workout';
import {
  DISCIPLINE_META,
  formatDateFr,
  formatDuration,
  formatPace,
} from '../utils/format';
import { RunStatsCard } from './RunStatsCard';

interface WorkoutHistoryProps {
  history: WorkoutSessionLog[];
  onOpenImportRun: () => void;
  onDeleteLog: (id: string) => void;
}

export function WorkoutHistory({
  history,
  onOpenImportRun,
  onDeleteLog,
}: WorkoutHistoryProps) {
  const [disciplineFilter, setDisciplineFilter] = useState<Discipline | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(history[0]?.id ?? null);

  const filtered = useMemo(() => {
    if (disciplineFilter === 'all') return history;
    return history.filter((h) => h.discipline === disciplineFilter);
  }, [history, disciplineFilter]);

  const stats = useMemo(() => {
    const totalSessions = filtered.length;
    const totalSets = filtered.reduce(
      (acc, h) => acc + (h.discipline === 'street_workout' ? h.totalSetsCompleted : 0),
      0
    );
    const totalRunKm = filtered.reduce(
      (acc, h) => acc + (h.runStats?.distanceKm ?? 0),
      0
    );
    const totalTimeSec = filtered.reduce((acc, h) => acc + h.durationSec, 0);
    return { totalSessions, totalSets, totalRunKm, totalTimeSec };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Historique &amp; Statistiques
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Toutes tes séances Street Workout, tes sorties Running et tes imports Strava GPX / FIT.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenImportRun}
          className="btn-primary px-4 py-2.5 text-sm"
        >
          <FileUp className="h-4 w-4" />
          Importer GPX / FIT (Strava)
        </button>
      </div>

      {/* Discipline Filter */}
      <div className="inline-flex rounded-2xl border border-slate-200/90 bg-white p-1 dark:border-white/[0.08] dark:bg-[#0d121c]">
        {(['all', 'street_workout', 'running'] as const).map((disc) => (
          <button
            key={disc}
            type="button"
            onClick={() => setDisciplineFilter(disc)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              disciplineFilter === disc
                ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {disc === 'street_workout' && <Dumbbell className="h-3.5 w-3.5" />}
            {disc === 'running' && <Footprints className="h-3.5 w-3.5" />}
            {disc === 'all'
              ? `Toutes (${history.length})`
              : DISCIPLINE_META[disc].label}
          </button>
        ))}
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="surface-card p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Séances
          </div>
          <div className="font-display mt-1 text-3xl font-bold tabular-nums">
            {stats.totalSessions}
          </div>
        </div>
        <div className="surface-card p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Distance Running
          </div>
          <div className="font-display mt-1 text-3xl font-bold tabular-nums text-emerald-500">
            {stats.totalRunKm.toFixed(1)}{' '}
            <span className="text-sm font-semibold text-slate-500">km</span>
          </div>
        </div>
        <div className="surface-card p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Séries Street
          </div>
          <div className="font-display mt-1 text-3xl font-bold tabular-nums text-cyan-500">
            {stats.totalSets}
          </div>
        </div>
        <div className="surface-card p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Temps cumulé
          </div>
          <div className="font-display mt-1 text-3xl font-bold tabular-nums">
            {formatDuration(stats.totalTimeSec)}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="surface-card border-dashed p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/[0.05]">
            <History className="h-7 w-7" />
          </div>
          <h2 className="font-display mt-4 text-xl font-bold">
            Aucune séance enregistrée
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Lance une séance depuis &laquo; Mes séances &raquo; ou importe un fichier GPX / FIT Strava.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((log) => {
            const isOpen = expandedId === log.id;
            const isRunning = log.discipline === 'running' || Boolean(log.runStats);
            const discMeta = DISCIPLINE_META[isRunning ? 'running' : 'street_workout'];

            return (
              <div key={log.id} className="surface-card overflow-hidden">
                <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : log.id)}
                    className="flex flex-1 items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-bold sm:text-lg">
                          {log.workoutName}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${discMeta.badgeClass}`}
                        >
                          {isRunning ? (
                            <Footprints className="h-3 w-3" />
                          ) : (
                            <Dumbbell className="h-3 w-3" />
                          )}
                          {discMeta.shortLabel}
                        </span>
                        {log.runStats?.sourceFormat &&
                          log.runStats.sourceFormat !== 'manual' && (
                            <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-600 dark:text-cyan-300">
                              {log.runStats.sourceFormat}
                            </span>
                          )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDateFr(log.finishedAt)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-cyan-500" />
                          {formatDuration(log.durationSec)}
                        </span>
                        {isRunning && log.runStats ? (
                          <>
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                              <Route className="h-3.5 w-3.5" />
                              {log.runStats.distanceKm.toFixed(2)} km
                            </span>
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                              <Activity className="h-3.5 w-3.5" />
                              {formatPace(log.runStats.avgMovingPaceSecPerKm)}
                            </span>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5 text-emerald-500" />
                            {log.totalSetsCompleted} série{log.totalSetsCompleted > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteLog(log.id)}
                    title="Supprimer cette entrée"
                    className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {isOpen && (
                  <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 p-4 sm:p-5 dark:border-white/[0.06] dark:bg-white/[0.015]">
                    {isRunning && log.runStats ? (
                      <RunStatsCard stats={log.runStats} />
                    ) : (
                      log.exercises.map((ex, idx) => {
                        const done = ex.sets.filter((s) => s.completed);
                        if (done.length === 0) return null;
                        return (
                          <div
                            key={`${ex.exerciseId}_${idx}`}
                            className="surface-inset flex flex-col justify-between gap-1.5 px-4 py-3 sm:flex-row sm:items-center"
                          >
                            <span className="text-sm font-bold">{ex.exerciseName}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {done.map((s, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300"
                                >
                                  {s.actual}
                                  {ex.unit === 'seconds' ? 's' : ''}
                                  {s.weightKg ? ` (+${s.weightKg}kg)` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
