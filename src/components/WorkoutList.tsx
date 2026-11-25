import { useMemo, useState } from 'react';
import {
  Activity,
  Clock,
  Copy,
  Dumbbell,
  FileUp,
  Footprints,
  Layers,
  Pencil,
  Play,
  Plus,
  Route,
  Search,
  Trash2,
} from 'lucide-react';
import { Discipline, Exercise, WorkoutTemplate } from '../types/workout';
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Mes séances
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Street Workout et Running : crée tes modèles, lance le chrono ou importe tes sorties Strava.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenImportRun}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-300"
          >
            <FileUp className="h-4 w-4" />
            Importer GPX / FIT
          </button>
          <button
            type="button"
            onClick={onCreateWorkout}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400 active:scale-[0.98] sm:flex-none"
          >
            <Plus className="h-5 w-5" />
            Nouvelle séance
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex self-start rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
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
              placeholder="Rechercher une séance..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm outline-none transition focus:border-cyan-500 dark:border-slate-800 dark:bg-slate-900"
            />
          </div>
        )}
      </div>

      {filteredWorkouts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <Dumbbell className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 text-lg font-semibold">
            {workouts.length === 0 ? 'Aucune séance créée' : 'Aucun résultat'}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {workouts.length === 0
              ? 'Crée ta première séance Street Workout ou Running.'
              : 'Essaie un autre filtre ou mot-clé.'}
          </p>
          {workouts.length === 0 && (
            <button
              type="button"
              onClick={onCreateWorkout}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
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
            const accent = WORKOUT_ACCENTS[workout.accent ?? (isRunning ? 'emerald' : 'cyan')];
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
                className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md dark:bg-slate-900/90 ${accent.border}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-3 w-3 shrink-0 rounded-full ${accent.dot}`} />
                      <h2 className="text-lg font-bold leading-tight">{workout.name}</h2>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${discMeta.badgeClass}`}
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
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                      {workout.description}
                    </p>
                  )}

                  {isRunning ? (
                    <div className="mt-4 space-y-3">
                      <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                        <span
                          className={`rounded-lg border px-2.5 py-1 ${CATEGORY_META[runType].badgeClass}`}
                        >
                          {CATEGORY_META[runType].label}
                        </span>
                        {runDist && (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800/80">
                            <Route className="h-3.5 w-3.5 text-emerald-500" />
                            {runDist} km
                          </span>
                        )}
                        {runDur && (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800/80">
                            <Clock className="h-3.5 w-3.5 text-cyan-500" />
                            {formatDuration(runDur)}
                          </span>
                        )}
                        {runDist && runDur && (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800/80">
                            <Activity className="h-3.5 w-3.5 text-amber-500" />
                            {formatPace(runDur / runDist)}
                          </span>
                        )}
                      </div>
                      {workout.runningConfig?.notes && (
                        <p className="border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                          {workout.runningConfig.notes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800/80">
                          <Layers className="h-3.5 w-3.5 text-cyan-500" />
                          {totalSets} série{totalSets > 1 ? 's' : ''}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800/80">
                          <Clock className="h-3.5 w-3.5 text-emerald-500" />
                          ~{formatDuration(estimatedSec)}
                        </span>
                      </div>

                      <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800/80">
                        {workout.exercises.slice(0, 4).map((item) => {
                          const ex = exerciseMap.get(item.exerciseId);
                          const unit = ex?.unit ?? 'reps';
                          return (
                            <li
                              key={item.id}
                              className="flex items-center justify-between gap-2 text-sm"
                            >
                              <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                                {ex?.name ?? 'Exercice supprimé'}
                              </span>
                              <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                                {summarizeSets(item.sets, unit)} ·{' '}
                                {formatDuration(item.restBetweenSetsSec)}
                              </span>
                            </li>
                          );
                        })}
                        {workout.exercises.length > 4 && (
                          <li className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            + {workout.exercises.length - 4} autre(s) exercice(s)
                          </li>
                        )}
                      </ul>
                    </>
                  )}
                </div>

                <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                  {isDeleting ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-rose-500/10 p-2.5 text-xs">
                      <span className="font-medium text-rose-600 dark:text-rose-300">
                        Supprimer cette séance ?
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteWorkout(workout.id);
                            setConfirmDeleteId(null);
                          }}
                          className="rounded-lg bg-rose-600 px-2.5 py-1.5 font-semibold text-white hover:bg-rose-500"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!canLaunch}
                        onClick={() => onStartWorkout(workout)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        Lancer
                      </button>

                      <button
                        type="button"
                        onClick={() => onEditWorkout(workout)}
                        title="Modifier"
                        aria-label="Modifier la séance"
                        className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDuplicateWorkout(workout.id)}
                        title="Dupliquer"
                        aria-label="Dupliquer la séance"
                        className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Copy className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(workout.id)}
                        title="Supprimer"
                        aria-label="Supprimer la séance"
                        className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-500 dark:border-slate-800 dark:text-slate-400"
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
