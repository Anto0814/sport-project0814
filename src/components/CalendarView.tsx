import { useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  FileUp,
  Pencil,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  Exercise,
  PlannedWorkout,
  WorkoutProgram,
  WorkoutSessionLog,
  WorkoutTemplate,
} from '../types/workout';
import {
  buildMonthGrid,
  cloneWorkoutForSlot,
  createEmptyWorkout,
  formatLongDateFr,
  formatMonthYearFr,
  getTodayStr,
  resolveDaySummary,
  ResolvedScheduledItem,
  WEEKDAY_NAMES_SHORT,
} from '../utils/calendar';
import {
  estimateWorkoutDurationSec,
  formatDuration,
  formatPace,
  generateId,
  WORKOUT_ACCENTS,
} from '../utils/format';
import { ProgramEditor } from './ProgramEditor';
import { WorkoutEditor } from './WorkoutEditor';

interface CalendarViewProps {
  workouts: WorkoutTemplate[];
  exercises: Exercise[];
  exerciseMap: Map<string, Exercise>;
  history: WorkoutSessionLog[];
  plannedWorkouts: PlannedWorkout[];
  programs: WorkoutProgram[];
  onStartWorkout: (workout: WorkoutTemplate) => void;
  onOpenImportRun: () => void;
  onSavePlannedWorkout: (planned: PlannedWorkout) => void;
  onDeletePlannedWorkout: (plannedId: string) => void;
  onSaveProgram: (program: WorkoutProgram) => void;
  onToggleProgramActive: (programId: string) => void;
  onDeleteProgram: (programId: string) => void;
  onSaveExercise: (exercise: Exercise) => void;
}

type CalendarSubTab = 'calendar' | 'programs';

export function CalendarView({
  workouts,
  exercises,
  exerciseMap,
  history,
  plannedWorkouts,
  programs,
  onStartWorkout,
  onOpenImportRun,
  onSavePlannedWorkout,
  onDeletePlannedWorkout,
  onSaveProgram,
  onToggleProgramActive,
  onDeleteProgram,
  onSaveExercise,
}: CalendarViewProps) {
  const todayStr = getTodayStr();
  const now = new Date();
  const [subTab, setSubTab] = useState<CalendarSubTab>('calendar');
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Program editor state
  const [editingProgram, setEditingProgram] = useState<WorkoutProgram | null | undefined>(
    undefined
  );

  // Per-day workout customization state
  const [customizingDayContext, setCustomizingDayContext] = useState<{
    date: string;
    existingPlannedId?: string;
    sourceProgramId?: string;
    workout: WorkoutTemplate;
  } | null>(null);

  const monthCells = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const daySummaries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof resolveDaySummary>>();
    for (const cell of monthCells) {
      map.set(
        cell.dateStr,
        resolveDaySummary(cell.dateStr, history, plannedWorkouts, programs)
      );
    }
    if (!map.has(selectedDate)) {
      map.set(
        selectedDate,
        resolveDaySummary(selectedDate, history, plannedWorkouts, programs)
      );
    }
    return map;
  }, [monthCells, selectedDate, history, plannedWorkouts, programs]);

  const selectedSummary =
    daySummaries.get(selectedDate) ??
    resolveDaySummary(selectedDate, history, plannedWorkouts, programs);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setSelectedDate(getTodayStr());
  };

  const handleScheduleTemplate = (templateId: string) => {
    if (!templateId) return;
    if (templateId === '__custom__') {
      const fresh = createEmptyWorkout('Séance sur mesure');
      setCustomizingDayContext({
        date: selectedDate,
        workout: fresh,
      });
      return;
    }
    const tpl = workouts.find((w) => w.id === templateId);
    if (!tpl) return;
    onSavePlannedWorkout({
      id: generateId('plan'),
      date: selectedDate,
      workout: cloneWorkoutForSlot(tpl),
    });
  };

  const handleCustomizeScheduledItem = (item: ResolvedScheduledItem) => {
    setCustomizingDayContext({
      date: selectedDate,
      existingPlannedId: item.plannedId,
      sourceProgramId: item.programId,
      workout: cloneWorkoutForSlot(item.workout),
    });
  };

  const handleSkipOrDeleteItem = (item: ResolvedScheduledItem) => {
    if (item.origin === 'manual' && item.plannedId) {
      onDeletePlannedWorkout(item.plannedId);
      return;
    }
    if (item.origin === 'program_override' && item.plannedId) {
      onSavePlannedWorkout({
        id: item.plannedId,
        date: selectedDate,
        sourceProgramId: item.programId,
        skipped: true,
      });
      return;
    }
    if (item.origin === 'program' && item.programId) {
      onSavePlannedWorkout({
        id: generateId('plan'),
        date: selectedDate,
        sourceProgramId: item.programId,
        skipped: true,
      });
    }
  };

  const handleRestoreSkippedPrograms = () => {
    const skippedOverrides = plannedWorkouts.filter(
      (p) => p.date === selectedDate && p.sourceProgramId && p.skipped
    );
    skippedOverrides.forEach((p) => onDeletePlannedWorkout(p.id));
  };

  // Nested ProgramEditor
  if (editingProgram !== undefined) {
    return (
      <ProgramEditor
        initialProgram={editingProgram}
        workouts={workouts}
        exercises={exercises}
        exerciseMap={exerciseMap}
        onSaveExercise={onSaveExercise}
        onSaveProgram={(program) => {
          onSaveProgram(program);
          setEditingProgram(undefined);
        }}
        onCancel={() => setEditingProgram(undefined)}
      />
    );
  }

  // Nested WorkoutEditor for customizing a single day on the calendar
  if (customizingDayContext) {
    return (
      <WorkoutEditor
        initialWorkout={customizingDayContext.workout}
        exercises={exercises}
        exerciseMap={exerciseMap}
        titleOverride={`Séance du ${formatLongDateFr(customizingDayContext.date)}`}
        contextBadge={
          customizingDayContext.sourceProgramId
            ? 'Personnalisation ponctuelle (ne modifie pas le programme)'
            : 'Planification calendrier'
        }
        onSaveExercise={onSaveExercise}
        onSaveWorkout={(updatedWorkout) => {
          onSavePlannedWorkout({
            id: customizingDayContext.existingPlannedId ?? generateId('plan'),
            date: customizingDayContext.date,
            sourceProgramId: customizingDayContext.sourceProgramId,
            skipped: false,
            workout: updatedWorkout,
          });
          setCustomizingDayContext(null);
        }}
        onCancel={() => setCustomizingDayContext(null)}
      />
    );
  }

  const activeProgramsCount = programs.filter((p) => p.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header + Sub-tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Calendrier &amp; Programmes
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Visualise tes séances passées, planifie le futur et configure des cycles ou semaines types.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenImportRun}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
          >
            <FileUp className="h-3.5 w-3.5" />
            Importer GPX / FIT
          </button>

          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setSubTab('calendar')}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                subTab === 'calendar'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              Calendrier
            </button>
            <button
              type="button"
              onClick={() => setSubTab('programs')}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                subTab === 'programs'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Repeat className="h-4 w-4" />
              Programmes ({activeProgramsCount})
            </button>
          </div>
        </div>
      </div>

      {subTab === 'programs' ? (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h2 className="text-base font-bold">Programmes répétables</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Crée un cycle (ex : 1 jour sur 2) ou une semaine type (Lundi → Dimanche) avec des séances personnalisables.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingProgram(null)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-cyan-500/20 hover:bg-cyan-400"
            >
              <Plus className="h-4 w-4" />
              Nouveau programme
            </button>
          </div>

          {programs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center dark:border-slate-800 dark:bg-slate-900/40">
              <Repeat className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="mt-3 text-lg font-semibold">Aucun programme créé</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Configure un cycle (1 jour sur 2, 2 ON / 1 OFF…) ou une semaine type répétitive pour remplir automatiquement ton calendrier.
              </p>
              <button
                type="button"
                onClick={() => setEditingProgram(null)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
              >
                <Plus className="h-4 w-4" />
                Créer mon premier programme
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {programs.map((prog) => {
                const trainingDays = prog.slots.filter((s) => s.workout !== null).length;
                return (
                  <article
                    key={prog.id}
                    className={`flex flex-col justify-between rounded-2xl border p-5 transition ${
                      prog.isActive
                        ? 'border-cyan-500/50 bg-white shadow-sm dark:bg-slate-900'
                        : 'border-slate-200 bg-white/70 opacity-80 dark:border-slate-800 dark:bg-slate-900/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                prog.isActive
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                                  : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {prog.isActive ? 'Actif' : 'En pause'}
                            </span>
                            <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-700 dark:text-cyan-300">
                              {prog.type === 'weekly'
                                ? 'Semaine type'
                                : `Cycle ${prog.slots.length} jours`}
                            </span>
                          </div>
                          <h3 className="mt-2 text-lg font-bold">{prog.name}</h3>
                        </div>

                        <input
                          type="checkbox"
                          checked={prog.isActive}
                          onChange={() => onToggleProgramActive(prog.id)}
                          title="Activer / désactiver sur le calendrier"
                          className="h-5 w-5 accent-cyan-500"
                        />
                      </div>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Début : {prog.startDate}
                        {prog.endDate ? ` · Fin : ${prog.endDate}` : ' · Répétition continue'} ·{' '}
                        {trainingDays} séance{trainingDays > 1 ? 's' : ''} /{' '}
                        {prog.slots.length} jours
                      </p>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {prog.slots.map((slot, idx) => (
                          <span
                            key={slot.id}
                            className={`rounded-lg px-2 py-1 text-[11px] font-medium ${
                              slot.workout
                                ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                                : 'border border-dashed border-slate-300 text-slate-400 dark:border-slate-700'
                            }`}
                          >
                            {prog.type === 'weekly'
                              ? WEEKDAY_NAMES_SHORT[idx]
                              : `J${idx + 1}`}
                            : {slot.workout ? slot.workout.name : 'Repos'}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setEditingProgram(prog)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Modifier / Personnaliser
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProgram(prog.id)}
                        className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-500 dark:border-slate-800"
                        title="Supprimer le programme"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          {/* Monthly calendar grid */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPrevMonth}
                  className="rounded-xl border border-slate-200 p-2 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                  aria-label="Mois précédent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h2 className="min-w-[160px] text-center text-base font-bold capitalize sm:text-lg">
                  {formatMonthYearFr(viewYear, viewMonth)}
                </h2>
                <button
                  type="button"
                  onClick={goNextMonth}
                  className="rounded-xl border border-slate-200 p-2 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                  aria-label="Mois suivant"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={goToday}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
              >
                Aujourd&apos;hui
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {WEEKDAY_NAMES_SHORT.map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {monthCells.map((cell) => {
                const summary = daySummaries.get(cell.dateStr);
                const completedCount = summary?.completedLogs.length ?? 0;
                const scheduledCount = summary?.scheduledItems.length ?? 0;
                const isToday = cell.dateStr === todayStr;
                const isSelected = cell.dateStr === selectedDate;

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(cell.dateStr)}
                    className={`flex min-h-[58px] flex-col items-start justify-between rounded-xl border p-1.5 text-left transition sm:min-h-[82px] sm:p-2 ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/30'
                        : isToday
                          ? 'border-emerald-500/50 bg-emerald-500/5'
                          : 'border-slate-100 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-800/40'
                    } ${!cell.isCurrentMonth ? 'opacity-40' : ''}`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold tabular-nums ${
                        isToday
                          ? 'bg-emerald-500 text-slate-950'
                          : isSelected
                            ? 'text-cyan-600 dark:text-cyan-300'
                            : ''
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Mobile dots */}
                    <div className="flex flex-wrap gap-1 sm:hidden">
                      {completedCount > 0 && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      )}
                      {scheduledCount > 0 && (
                        <span className="h-2 w-2 rounded-full bg-cyan-500" />
                      )}
                    </div>

                    {/* Desktop compact labels */}
                    <div className="hidden w-full space-y-0.5 sm:block">
                      {summary?.completedLogs.slice(0, 1).map((log) => (
                        <div
                          key={log.id}
                          className="truncate rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
                        >
                          ✓ {log.workoutName}
                        </div>
                      ))}
                      {summary?.scheduledItems.slice(0, 2).map((item) => (
                        <div
                          key={item.key}
                          className={`truncate rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            item.origin === 'program_override'
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                              : 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                          }`}
                        >
                          {item.workout.name}
                        </div>
                      ))}
                      {completedCount + scheduledCount > 2 && (
                        <div className="text-[10px] font-medium text-slate-400">
                          +{completedCount + scheduledCount - 2}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Séance effectuée
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
                Séance planifiée / Programme
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Modifiée pour ce jour
              </span>
            </div>
          </section>

          {/* Selected Day Inspector */}
          <aside className="space-y-4">
            <div className="sticky top-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  {selectedDate === todayStr ? "Aujourd'hui" : 'Jour sélectionné'}
                </div>
                <h3 className="mt-0.5 text-lg font-bold capitalize">
                  {formatLongDateFr(selectedDate)}
                </h3>
              </div>

              {/* Completed workouts on this date */}
              {selectedSummary.completedLogs.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Effectuée(s)
                  </div>
                  {selectedSummary.completedLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800 dark:text-emerald-200">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          {log.workoutName}
                        </span>
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          {formatDuration(log.durationSec)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                        {log.runStats ? (
                          <>
                            {log.runStats.distanceKm.toFixed(2)} km ·{' '}
                            {formatPace(log.runStats.avgMovingPaceSecPerKm)}
                            {log.runStats.stoppedDurationSec > 0
                              ? ` · Pause ${formatDuration(log.runStats.stoppedDurationSec)}`
                              : ''}
                          </>
                        ) : (
                          <>
                            {log.totalSetsCompleted} série{log.totalSetsCompleted > 1 ? 's' : ''} validée
                            {log.totalSetsCompleted > 1 ? 's' : ''}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Scheduled workouts on this date */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Au programme
                </div>

                {selectedSummary.scheduledItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center dark:border-slate-800">
                    <Coffee className="mx-auto h-6 w-6 text-slate-400" />
                    <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {selectedSummary.hasSkippedProgramRest
                        ? 'Passé en jour de repos pour cette date.'
                        : 'Aucune séance prévue pour ce jour.'}
                    </p>
                    {selectedSummary.hasSkippedProgramRest && (
                      <button
                        type="button"
                        onClick={handleRestoreSkippedPrograms}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:underline dark:text-cyan-400"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Rétablir la séance du programme
                      </button>
                    )}
                  </div>
                ) : (
                  selectedSummary.scheduledItems.map((item) => {
                    const accent = WORKOUT_ACCENTS[item.workout.accent ?? 'cyan'];
                    const estSec = estimateWorkoutDurationSec(
                      item.workout,
                      exerciseMap
                    );
                    return (
                      <div
                        key={item.key}
                        className={`rounded-2xl border p-4 ${accent.border} bg-slate-50/70 dark:bg-slate-950/70`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-block rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {item.origin === 'manual'
                                ? 'Planifiée'
                                : item.origin === 'program_override'
                                  ? `Personnalisée (${item.programName})`
                                  : `${item.programName} · ${item.slotLabel}`}
                            </span>
                            <h4 className="mt-1.5 font-bold">{item.workout.name}</h4>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          {item.workout.discipline === 'running' ? (
                            <span>
                              Running
                              {item.workout.runningConfig?.targetDistanceKm
                                ? ` · ${item.workout.runningConfig.targetDistanceKm} km`
                                : ''}
                            </span>
                          ) : (
                            <span>
                              {item.workout.exercises.length} exo
                              {item.workout.exercises.length > 1 ? 's' : ''}
                            </span>
                          )}
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />~{formatDuration(estSec)}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={
                              item.workout.discipline !== 'running' &&
                              item.workout.exercises.length === 0
                            }
                            onClick={() => onStartWorkout(item.workout)}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            Lancer
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCustomizeScheduledItem(item)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                            title="Personnaliser cette séance uniquement pour ce jour"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Personnaliser
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSkipOrDeleteItem(item)}
                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:border-rose-500/40 hover:text-rose-500 dark:border-slate-800 dark:bg-slate-900"
                            title={
                              item.origin === 'manual'
                                ? 'Retirer du calendrier'
                                : 'Passer en repos pour ce jour'
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add a workout to this specific date */}
              <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Planifier une séance ce jour
                </label>
                <select
                  value=""
                  onChange={(e) => handleScheduleTemplate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold outline-none focus:border-cyan-500 dark:border-slate-800 dark:bg-slate-950"
                >
                  <option value="">+ Choisir ou créer une séance...</option>
                  {workouts.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (
                      {w.discipline === 'running'
                        ? `${w.runningConfig?.targetDistanceKm ?? '?'} km · Running`
                        : `${w.exercises.length} exos`}
                      )
                    </option>
                  ))}
                  <option value="__custom__">+ Créer une séance personnalisée</option>
                </select>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
