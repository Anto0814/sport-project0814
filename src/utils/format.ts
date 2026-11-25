import { Discipline, Exercise, ExerciseCategory, RunningCategory, StreetWorkoutCategory, WorkoutTemplate } from '../types/workout';

export function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  if (mins > 0 && secs > 0) {
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  }
  if (mins > 0) {
    return `${mins}m`;
  }
  return `${secs}s`;
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatDateFr(isoString: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export function formatPace(secPerKm: number): string {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return '--:-- /km';
  const rounded = Math.round(secPerKm);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${secs.toString().padStart(2, '0')} /km`;
}

export function formatSpeed(kmh: number): string {
  if (!Number.isFinite(kmh) || kmh <= 0) return '0.0 km/h';
  return `${kmh.toFixed(1)} km/h`;
}

export function estimateWorkoutDurationSec(
  workout: WorkoutTemplate,
  exerciseMap: Map<string, Exercise>
): number {
  if (workout.discipline === 'running') {
    if (workout.runningConfig?.targetDurationSec && workout.runningConfig.targetDurationSec > 0) {
      return workout.runningConfig.targetDurationSec;
    }
    if (workout.runningConfig?.targetDistanceKm && workout.runningConfig.targetDistanceKm > 0) {
      // Fallback estimate ~5:30 /km
      return Math.round(workout.runningConfig.targetDistanceKm * 330);
    }
    return 1800;
  }

  let total = 0;

  workout.exercises.forEach((item, index) => {
    const ex = exerciseMap.get(item.exerciseId);
    const isSeconds = ex?.unit === 'seconds';

    item.sets.forEach((set, setIndex) => {
      // Work time: exact seconds for holds, or ~3.5s per rep (minimum 15s) for dynamic sets
      total += isSeconds ? set.target : Math.max(15, Math.round(set.target * 3.5));

      if (setIndex < item.sets.length - 1) {
        total += item.restBetweenSetsSec;
      }
    });

    if (index < workout.exercises.length - 1) {
      total += item.restAfterExerciseSec;
    }
  });

  return total;
}

export function summarizeSets(sets: { target: number }[], unit: 'reps' | 'seconds'): string {
  if (sets.length === 0) return '0 série';
  const suffix = unit === 'seconds' ? 's' : ' reps';
  const allSame = sets.every((s) => s.target === sets[0].target);
  if (allSame) {
    return `${sets.length} × ${sets[0].target}${suffix}`;
  }
  return `${sets.length} séries (${sets.map((s) => `${s.target}${unit === 'seconds' ? 's' : ''}`).join('-')})`;
}

export const STREET_CATEGORIES: StreetWorkoutCategory[] = [
  'push',
  'pull',
  'skill',
  'core',
  'legs',
  'full',
];

export const RUNNING_CATEGORIES: RunningCategory[] = [
  'endurance',
  'intervals',
  'tempo',
  'trail',
  'recovery',
];

export const DISCIPLINE_META: Record<
  Discipline,
  { label: string; shortLabel: string; badgeClass: string }
> = {
  street_workout: {
    label: 'Street Workout',
    shortLabel: 'Street',
    badgeClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  },
  running: {
    label: 'Running',
    shortLabel: 'Running',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
};

export const CATEGORY_META: Record<
  ExerciseCategory,
  { label: string; badgeClass: string; discipline: Discipline }
> = {
  push: {
    label: 'Push',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/25',
    discipline: 'street_workout',
  },
  pull: {
    label: 'Pull',
    badgeClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/25',
    discipline: 'street_workout',
  },
  skill: {
    label: 'Figure / Skill',
    badgeClass: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/25',
    discipline: 'street_workout',
  },
  core: {
    label: 'Gainage / Core',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    discipline: 'street_workout',
  },
  legs: {
    label: 'Jambes',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25',
    discipline: 'street_workout',
  },
  full: {
    label: 'Full Body',
    badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/25',
    discipline: 'street_workout',
  },
  endurance: {
    label: 'Endurance',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    discipline: 'running',
  },
  intervals: {
    label: 'Fractionné',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25',
    discipline: 'running',
  },
  tempo: {
    label: 'Seuil / Tempo',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/25',
    discipline: 'running',
  },
  trail: {
    label: 'Trail / Côtes',
    badgeClass: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/25',
    discipline: 'running',
  },
  recovery: {
    label: 'Récupération',
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/25',
    discipline: 'running',
  },
};

export const WORKOUT_ACCENTS: Record<
  NonNullable<WorkoutTemplate['accent']>,
  { label: string; dot: string; border: string; pill: string; bar: string; glow: string }
> = {
  cyan: {
    label: 'Cyan',
    dot: 'bg-cyan-400',
    border: 'border-cyan-500/30 dark:border-cyan-400/20',
    pill: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300',
    bar: 'from-cyan-400 via-sky-400 to-blue-500',
    glow: 'from-cyan-500/12 to-transparent',
  },
  emerald: {
    label: 'Émeraude',
    dot: 'bg-emerald-400',
    border: 'border-emerald-500/30 dark:border-emerald-400/20',
    pill: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    bar: 'from-emerald-400 via-teal-400 to-cyan-400',
    glow: 'from-emerald-500/12 to-transparent',
  },
  amber: {
    label: 'Ambre',
    dot: 'bg-amber-400',
    border: 'border-amber-500/30 dark:border-amber-400/20',
    pill: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
    bar: 'from-amber-400 via-orange-400 to-rose-400',
    glow: 'from-amber-500/12 to-transparent',
  },
  rose: {
    label: 'Corail',
    dot: 'bg-rose-400',
    border: 'border-rose-500/30 dark:border-rose-400/20',
    pill: 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
    bar: 'from-rose-400 via-pink-500 to-fuchsia-500',
    glow: 'from-rose-500/12 to-transparent',
  },
  violet: {
    label: 'Violet',
    dot: 'bg-violet-400',
    border: 'border-violet-500/30 dark:border-violet-400/20',
    pill: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
    bar: 'from-violet-400 via-purple-400 to-indigo-500',
    glow: 'from-violet-500/12 to-transparent',
  },
};
