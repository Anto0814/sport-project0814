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
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Historique des séances
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Retrouve tes séances Street Workout, tes courses et tes imports Strava GPX / FIT.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenImportRun}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-300"
        >
          <FileUp className="h-4 w-4" />
          Importer GPX / FIT (Strava)
        </button>
      </div>

      {/* Discipline Filter */}
      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        {(['all', 'street_workout', 'running'] as const).map((disc) => (
          <button
            key={disc}
            type="button"
            onClick={() => setDisciplineFilter(disc)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              disciplineFilter === disc
                ? 'bg-cyan-500 text-slate-950'
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

      {/* Quick summary metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500">Séances</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{stats.totalSessions}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500">Distance Running</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {stats.totalRunKm.toFixed(1)} km
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500">Séries Street</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{stats.totalSets}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500">Temps cumulé</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {formatDuration(stats.totalTimeSec)}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <History className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 text-lg font-semibold">Aucune séance enregistrée</h2>
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
              <div
                key={log.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : log.id)}
                    className="flex flex-1 items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100">
                          {log.workoutName}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${discMeta.badgeClass}`}
                        >
                          {isRunning ? (
                            <Footprints className="h-3 w-3" />
                          ) : (
                            <Dumbbell className="h-3 w-3" />
                          )}
                          {discMeta.shortLabel}
                        </span>
                        {log.runStats?.sourceFormat && log.runStats.sourceFormat !== 'manual' && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {log.runStats.sourceFormat}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDateFr(log.finishedAt)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-emerald-500" />
                          {formatDuration(log.durationSec)}
                        </span>
                        {isRunning && log.runStats ? (
                          <>
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                              <Route className="h-3.5 w-3.5" />
                              {log.runStats.distanceKm.toFixed(2)} km
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Activity className="h-3.5 w-3.5 text-amber-500" />
                              {formatPace(log.runStats.avgMovingPaceSecPerKm)}
                            </span>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5 text-cyan-500" />
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
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {isOpen && (
                  <div className="space-y-2 border-t border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                    {isRunning && log.runStats ? (
                      <RunStatsCard stats={log.runStats} />
                    ) : (
                      log.exercises.map((ex, idx) => {
                        const done = ex.sets.filter((s) => s.completed);
                        if (done.length === 0) return null;
                        return (
                          <div
                            key={`${ex.exerciseId}_${idx}`}
                            className="flex flex-col justify-between gap-1 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900"
                          >
                            <span className="text-sm font-semibold">{ex.exerciseName}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {done.map((s, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
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
