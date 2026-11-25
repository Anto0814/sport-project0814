import {
  PlannedWorkout,
  ProgramSlot,
  WorkoutProgram,
  WorkoutSessionLog,
  WorkoutTemplate,
} from '../types/workout';
import { generateId } from './format';

export const WEEKDAY_NAMES_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
export const WEEKDAY_NAMES_FULL = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
];

export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayStr(): string {
  return toLocalDateStr(new Date());
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * Computes whole-day difference (toStr - fromStr) using UTC dates to avoid DST shifts.
 */
export function diffDays(fromStr: string, toStr: string): number {
  const [fy, fm, fd] = fromStr.split('-').map(Number);
  const [ty, tm, td] = toStr.split('-').map(Number);
  const fromUtc = Date.UTC(fy, (fm || 1) - 1, fd || 1);
  const toUtc = Date.UTC(ty, (tm || 1) - 1, td || 1);
  return Math.round((toUtc - fromUtc) / 86400000);
}

/**
 * Returns 0 = Monday ... 6 = Sunday for a YYYY-MM-DD date string.
 */
export function getWeekdayMondayFirst(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcDay = new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay();
  return (utcDay + 6) % 7;
}

export function formatLongDateFr(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatMonthYearFr(year: number, monthIndex: number): string {
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, monthIndex, 1));
}

export interface MonthCell {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
}

/**
 * Generates a 35 or 42-day Monday-first calendar grid for a given year & 0-indexed month.
 */
export function buildMonthGrid(year: number, monthIndex: number): MonthCell[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const cells: MonthCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    const cellDate = new Date(year, monthIndex, 1 - startOffset + i);
    cells.push({
      dateStr: toLocalDateStr(cellDate),
      dayNumber: cellDate.getDate(),
      isCurrentMonth: cellDate.getMonth() === monthIndex,
    });
  }
  return cells;
}

/**
 * Deep-clones a WorkoutTemplate with fresh IDs so customizing it in a schedule or program
 * never mutates the original template.
 */
export function cloneWorkoutForSlot(template: WorkoutTemplate): WorkoutTemplate {
  const now = new Date().toISOString();
  return {
    ...template,
    id: generateId('wk'),
    createdAt: now,
    updatedAt: now,
    exercises: template.exercises.map((item) => ({
      ...item,
      id: generateId('wex'),
      sets: item.sets.map((s) => ({ ...s, id: generateId('s') })),
    })),
  };
}

export function createEmptyWorkout(
  name = 'Séance personnalisée',
  discipline: 'street_workout' | 'running' = 'street_workout'
): WorkoutTemplate {
  const now = new Date().toISOString();
  return {
    id: generateId('wk'),
    name,
    discipline,
    accent: discipline === 'running' ? 'emerald' : 'cyan',
    exercises: [],
    runningConfig:
      discipline === 'running'
        ? { runType: 'endurance', targetDistanceKm: 5, targetDurationSec: 30 * 60 }
        : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export interface ResolvedScheduledItem {
  key: string;
  workout: WorkoutTemplate;
  origin: 'manual' | 'program' | 'program_override';
  plannedId?: string;
  programId?: string;
  programName?: string;
  slotLabel?: string;
}

export interface DaySummary {
  completedLogs: WorkoutSessionLog[];
  scheduledItems: ResolvedScheduledItem[];
  hasSkippedProgramRest: boolean;
}

export function resolveProgramSlotForDate(
  program: WorkoutProgram,
  dateStr: string
): { slot: ProgramSlot; label: string } | null {
  if (!program.isActive || program.slots.length === 0) return null;
  if (dateStr < program.startDate) return null;
  if (program.endDate && dateStr > program.endDate) return null;

  if (program.type === 'weekly') {
    const weekdayIdx = getWeekdayMondayFirst(dateStr);
    const slot = program.slots[weekdayIdx];
    if (!slot) return null;
    return {
      slot,
      label: WEEKDAY_NAMES_FULL[weekdayIdx],
    };
  }

  const delta = diffDays(program.startDate, dateStr);
  if (delta < 0) return null;
  const cycleIdx = delta % program.slots.length;
  const slot = program.slots[cycleIdx];
  if (!slot) return null;
  return {
    slot,
    label: slot.label || `Jour ${cycleIdx + 1}/${program.slots.length}`,
  };
}

export function resolveDaySummary(
  dateStr: string,
  history: WorkoutSessionLog[],
  plannedWorkouts: PlannedWorkout[],
  programs: WorkoutProgram[]
): DaySummary {
  const completedLogs = history.filter(
    (log) => toLocalDateStr(new Date(log.finishedAt)) === dateStr
  );

  const dayPlanned = plannedWorkouts.filter((p) => p.date === dateStr);
  const overrideByProgram = new Map<string, PlannedWorkout>();
  const manualItems: ResolvedScheduledItem[] = [];

  for (const planned of dayPlanned) {
    if (planned.sourceProgramId) {
      overrideByProgram.set(planned.sourceProgramId, planned);
    } else if (planned.workout && !planned.skipped) {
      manualItems.push({
        key: `manual_${planned.id}`,
        workout: planned.workout,
        origin: 'manual',
        plannedId: planned.id,
      });
    }
  }

  const programItems: ResolvedScheduledItem[] = [];
  let hasSkippedProgramRest = false;

  for (const program of programs) {
    const match = resolveProgramSlotForDate(program, dateStr);
    if (!match) continue;

    const override = overrideByProgram.get(program.id);
    if (override) {
      if (override.skipped) {
        hasSkippedProgramRest = true;
        continue;
      }
      if (override.workout) {
        programItems.push({
          key: `override_${override.id}`,
          workout: override.workout,
          origin: 'program_override',
          plannedId: override.id,
          programId: program.id,
          programName: program.name,
          slotLabel: match.label,
        });
        continue;
      }
    }

    if (match.slot.workout) {
      programItems.push({
        key: `prog_${program.id}_${dateStr}`,
        workout: match.slot.workout,
        origin: 'program',
        programId: program.id,
        programName: program.name,
        slotLabel: match.label,
      });
    }
  }

  return {
    completedLogs,
    scheduledItems: [...manualItems, ...programItems],
    hasSkippedProgramRest,
  };
}
