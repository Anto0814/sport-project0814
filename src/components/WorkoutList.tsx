import { useMemo, useState } from 'react';
import {
  Activity,
  Clock,
  Copy,
  Dumbbell,
  FileUp,
  Flame,
  Footprints,
  Layers,
  Pencil,
  Play,
  Plus,
  Route,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  Discipline,
  Exercise,
  WorkoutSessionLog,
  WorkoutTemplate,
} from '../types/workout';
import {
  CATEGORY_META,
  DISCIPLINE_META,
  estimateWorkoutDurationSec,
  formatDuration,
  formatPace,
  summarizeSets,
  WORKOUT_ACCENTS,
} from '../utils/format';

interface WorkoutListProps {
  workouts: WorkoutTemplate[];
  history: WorkoutSessionLog[];
  exerciseMap: Map<string, Exercise>;
  onStartWorkout: (workout: WorkoutTemplate) => void;
  onCreateWorkout: () => void;
  onOpenImportRun: () => void;
  onEditWorkout: (workout: WorkoutTemplate) => void;
  onDuplicateWorkout: (workoutId: string) => void;
  onDeleteWorkout: (workoutId: string) => void;
}

export function WorkoutList({
  workouts,
  history,
  exerciseMap,
  onStartWorkout,
  onCreateWorkout,
  onOpenImportRun,
  onEditWorkout,
  onDuplicateWorkout,
  onDeleteWorkout,
}: WorkoutListProps) {
  const [disciplineFilter, setDisciplineFilter] = useState<Discipline | 'all'>('all');
  const [query, setQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const quickStats = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const weekSessions = history.filter(
      (h) => new Date(h.finishedAt).getTime() >= sevenDaysAgo
    ).length;
    const totalRunKm = history.reduce((acc, h) => acc + (h.runStats?.distanceKm ?? 0), 0);
    return {
      totalWorkouts: workouts.length,
      weekSessions,
      totalSessions: history.length,
      totalRunKm,
    };
  }, [workouts.length, history]);

  const filteredWorkouts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workouts.filter((w) => {
      if (disciplineFilter !== 'all' && w.discipline !== disciplineFilter) return false;
      if (!q) return true;
      if (w.name.toLowerCase().includes(q)) return true;
      if (w.description?.toLowerCase().includes(q)) return true;
      return w.exercises.some((item) =>
        exerciseMap.get(item.exerciseId)?.name.toLowerCase().includes(q)
      );
    });
  }, [workouts, disciplineFilter, query, exerciseMap]);

  return (
    <div className="space-y-6">
      {/* Athletic Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7 dark:border-white/[0.08] dark:bg-[#0d121c]/90">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-br from-cyan-500/20 via-emerald-500/15 to-transparent blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
              <Sparkles className="h-3 w-3" />
              Tableau d&apos;entraînement
            </span>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Prêt pour ta séance ?
            </h1>
            <p className="max-w-xl text-sm text-slate-600 dark:text-slate-400">
              Street Workout &amp; Running — prépare tes programmes, déclenche tes chronos live ou importe tes sorties Strava.
            </p>
          </div>

          {/* Mini KPI pills */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 lg:min-w-[330px]">
            <div className="surface-inset p-3 text-center">
              <div className="font-display text-xl font-bold tabular-nums text-cyan-600 dark:text-cyan-400">
                {quickStats.totalWorkouts}
              </div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Modèles
              </div>
            </div>
            <div className="surface-inset p-3 text-center">
              <div className="font-display text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {quickStats.weekSessions}
              </div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Cette sem.
              </div>
            </div>
            <div className="surface-inset p-3 text-center">
              <div className="font-display text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {quickStats.totalRunKm.toFixed(1)}
              </div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Km courus
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-5 dark:border-white/[0.06]">
          <button
            type="button"
            onClick={onCreateWorkout}
            className="btn-primary flex-1 px-5 py-3 text-sm sm:flex-none"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            Nouvelle séance
          </button>
          <button
            type="button"
            onClick={onOpenImportRun}
            className="btn-secondary flex-1 px-4 py-3 text-sm sm:flex-none"
          >
            <FileUp className="h-4 w-4 text-emerald-500" />
            Importer Strava GPX / FIT
          </button>
        </div>
      </section>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex self-start rounded-2xl border border-slate-200/90 bg-white p-1 shadow-xs dark:border-white/[0.08] dark:bg-[#0d121c]">
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
              {disc === 'all' && <Flame className="h-3.5 w-3.5" />}
              {disc === 'street_workout' && <Dumbbell className="h-3.5 w-3.5" />}
              {disc === 'running' && <Footprints className="h-3.5 w-3.5" />}
              {disc === 'all'
                ? `Toutes (${workouts.length})`
                : DISCIPLINE_META[disc].label}
            </button>
          ))}
        </div>

        {workouts.length > 0 && (
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une séance ou un exo..."
              className="input-field pl-10"
            />
          </div>
        )}
      </div>

      {/* Workout Cards Grid */}
      {filteredWorkouts.length === 0 ? (
        <div className="surface-card border-dashed p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/[0.05]">
            <Dumbbell className="h-7 w-7" />
          </div>
          <h2 className="font-display mt-4 text-xl font-bold">
            {workouts.length === 0 ? 'Aucune séance créée' : 'Aucun résultat'}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {workouts.length === 0
              ? 'Crée ta première séance Street Workout ou Running pour commencer.'
              : 'Essaie un autre filtre ou mot-clé.'}
          </p>
          {workouts.length === 0 && (
            <button
              type="button"
              onClick={onCreateWorkout}
              className="btn-primary mt-5 px-5 py-2.5 text-sm"
            >
              <Plus className="h-4 w-4" />
              Créer une séance
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredWorkouts.map((workout) => {
            const isRunning = workout.discipline === 'running';
            const accent =
              WORKOUT_ACCENTS[workout.accent ?? (isRunning ? 'emerald' : 'cyan')];
            const discMeta = DISCIPLINE_META[workout.discipline];
            const totalSets = workout.exercises.reduce(
              (acc, item) => acc + item.sets.length,
              0
            );
            const estimatedSec = estimateWorkoutDurationSec(workout, exerciseMap);
            const isDeleting = confirmDeleteId === workout.id;

            const runDist = workout.runningConfig?.targetDistanceKm;
            const runDur = workout.runningConfig?.targetDurationSec;
            const runType = workout.runningConfig?.runType ?? 'endurance';
            const canLaunch = isRunning || workout.exercises.length > 0;

            return (
              <article
                key={workout.id}
                className="surface-card surface-card-hover group relative flex flex-col justify-between overflow-hidden"
              >
                {/* Top signature gradient hairline */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${accent.bar}`} />
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${accent.glow} opacity-80`}
                />

                <div className="relative p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-lg font-bold leading-snug">
                      {workout.name}
                    </h2>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${discMeta.badgeClass}`}
                    >
                      {isRunning ? (
                        <Footprints className="h-3 w-3" />
                      ) : (
                        <Dumbbell className="h-3 w-3" />
                      )}
                      {discMeta.shortLabel}
                    </span>
                  </div>

                  {workout.description && (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {workout.description}
                    </p>
                  )}

                  {isRunning ? (
                    <div className="mt-4 space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="surface-inset px-2.5 py-2 text-center">
                          <Route className="mx-auto h-3.5 w-3.5 text-emerald-500" />
                          <div className="mt-1 text-sm font-extrabold tabular-nums">
                            {runDist ? `${runDist} km` : 'Libre'}
                          </div>
                        </div>
                        <div className="surface-inset px-2.5 py-2 text-center">
                          <Clock className="mx-auto h-3.5 w-3.5 text-cyan-500" />
                          <div className="mt-1 text-sm font-extrabold tabular-nums">
                            {runDur ? formatDuration(runDur) : 'Libre'}
                          </div>
                        </div>
                        <div className="surface-inset px-2.5 py-2 text-center">
                          <Activity className="mx-auto h-3.5 w-3.5 text-amber-500" />
                          <div className="mt-1 text-xs font-extrabold tabular-nums">
                            {runDist && runDur
                              ? formatPace(runDur / runDist).replace(' /km', '')
                              : '--:--'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-lg border px-2.5 py-0.5 text-[11px] font-semibold ${CATEGORY_META[runType].badgeClass}`}
                        >
                          {CATEGORY_META[runType].label}
                        </span>
                      </div>

                      {workout.runningConfig?.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {workout.runningConfig.notes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-white/[0.06]">
                          <Layers className="h-3.5 w-3.5 text-cyan-500" />
                          {workout.exercises.length} exo{workout.exercises.length > 1 ? 's' : ''} · {totalSets} séries
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-white/[0.06]">
                          <Clock className="h-3.5 w-3.5 text-emerald-500" />
                          ~{formatDuration(estimatedSec)}
                        </span>
                      </div>

                      <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3.5 dark:border-white/[0.06]">
                        {workout.exercises.slice(0, 4).map((item) => {
                          const ex = exerciseMap.get(item.exerciseId);
                          const unit = ex?.unit ?? 'reps';
                          return (
                            <li
                              key={item.id}
                              className="flex items-center justify-between gap-2 text-xs"
                            >
                              <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
                                {ex?.name ?? 'Exercice supprimé'}
                              </span>
                              <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 tabular-nums dark:bg-white/[0.05] dark:text-slate-400">
                                {summarizeSets(item.sets, unit)} ·{' '}
                                {formatDuration(item.restBetweenSetsSec)}
                              </span>
                            </li>
                          );
                        })}
                        {workout.exercises.length > 4 && (
                          <li className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                            + {workout.exercises.length - 4} autre(s) exercice(s)
                          </li>
                        )}
                      </ul>
                    </>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="relative border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 dark:border-white/[0.06] dark:bg-white/[0.015]">
                  {isDeleting ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs">
                      <span className="font-semibold text-rose-600 dark:text-rose-300">
                        Supprimer ?
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg px-2.5 py-1 font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteWorkout(workout.id);
                            setConfirmDeleteId(null);
                          }}
                          className="rounded-lg bg-rose-600 px-2.5 py-1 font-bold text-white hover:bg-rose-500"
                        >
                          Confirmer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!canLaunch}
                        onClick={() => onStartWorkout(workout)}
                        className="btn-primary flex-1 px-4 py-2.5 text-sm"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        Lancer
                      </button>

                      <button
                        type="button"
                        onClick={() => onEditWorkout(workout)}
                        title="Modifier"
                        aria-label="Modifier la séance"
                        className="btn-secondary p-2.5"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDuplicateWorkout(workout.id)}
                        title="Dupliquer"
                        aria-label="Dupliquer la séance"
                        className="btn-secondary p-2.5"
                      >
                        <Copy className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(workout.id)}
                        title="Supprimer"
                        aria-label="Supprimer la séance"
                        className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-400 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-500 dark:border-white/10 dark:bg-white/[0.04]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
