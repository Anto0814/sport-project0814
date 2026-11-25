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
import { ToggleSwitch } from './ToggleSwitch';
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

  const [editingProgram, setEditingProgram] = useState<WorkoutProgram | null | undefined>(
    undefined
  );

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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Calendrier &amp; Programmes
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Visualise tes séances passées, planifie tes futures sorties et gère tes cycles répétables.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenImportRun}
            className="btn-secondary px-3.5 py-2.5 text-xs"
          >
            <FileUp className="h-3.5 w-3.5 text-emerald-500" />
            Importer GPX / FIT
          </button>

          <div className="inline-flex rounded-2xl border border-slate-200/90 bg-white p-1 dark:border-white/[0.08] dark:bg-[#0d121c]">
            <button
              type="button"
              onClick={() => setSubTab('calendar')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                subTab === 'calendar'
                  ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Calendrier
            </button>
            <button
              type="button"
              onClick={() => setSubTab('programs')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                subTab === 'programs'
                  ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Repeat className="h-3.5 w-3.5" />
              Programmes ({activeProgramsCount})
            </button>
          </div>
        </div>
      </div>

      {subTab === 'programs' ? (
        <div className="space-y-5">
          <div className="surface-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Programmes répétables</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Rythme en cycle (1 jour sur 2, 2 ON / 1 OFF…) ou semaine type (Lundi → Dimanche) personnalisable.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingProgram(null)}
              className="btn-primary px-4 py-2.5 text-sm"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Nouveau programme
            </button>
          </div>

          {programs.length === 0 ? (
            <div className="surface-card border-dashed p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/[0.05]">
                <Repeat className="h-7 w-7" />
              </div>
              <h3 className="font-display mt-4 text-xl font-bold">
                Aucun programme créé
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Crée un cycle ou une semaine type pour projeter automatiquement tes séances sur le calendrier.
              </p>
              <button
                type="button"
                onClick={() => setEditingProgram(null)}
                className="btn-primary mt-5 px-5 py-2.5 text-sm"
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
                    className={`surface-card relative flex flex-col justify-between overflow-hidden p-5 ${
                      prog.isActive ? 'border-cyan-500/35' : 'opacity-75'
                    }`}
                  >
                    {prog.isActive && (
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 to-emerald-400" />
                    )}
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                prog.isActive
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                                  : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400'
                              }`}
                            >
                              {prog.isActive ? 'Actif' : 'En pause'}
                            </span>
                            <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-bold text-cyan-700 dark:text-cyan-300">
                              {prog.type === 'weekly'
                                ? 'Semaine type'
                                : `Cycle ${prog.slots.length} jours`}
                            </span>
                          </div>
                          <h3 className="font-display mt-2.5 text-lg font-bold">
                            {prog.name}
                          </h3>
                        </div>

                        <ToggleSwitch
                          checked={prog.isActive}
                          onChange={() => onToggleProgramActive(prog.id)}
                          ariaLabel="Activer le programme"
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
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                              slot.workout
                                ? 'bg-slate-100 text-slate-800 dark:bg-white/[0.06] dark:text-slate-200'
                                : 'border border-dashed border-slate-300 text-slate-400 dark:border-white/10'
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

                    <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3.5 dark:border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => setEditingProgram(prog)}
                        className="btn-secondary px-3.5 py-2 text-xs"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Modifier / Personnaliser
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProgram(prog.id)}
                        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-500 dark:border-white/10 dark:bg-white/[0.04]"
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_385px]">
          {/* Monthly calendar */}
          <section className="surface-card p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPrevMonth}
                  className="btn-secondary p-2"
                  aria-label="Mois précédent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h2 className="font-display min-w-[165px] text-center text-lg font-bold capitalize sm:text-xl">
                  {formatMonthYearFr(viewYear, viewMonth)}
                </h2>
                <button
                  type="button"
                  onClick={goNextMonth}
                  className="btn-secondary p-2"
                  aria-label="Mois suivant"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={goToday}
                className="btn-secondary px-3.5 py-1.5 text-xs"
              >
                Aujourd&apos;hui
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {WEEKDAY_NAMES_SHORT.map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
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
                    className={`flex min-h-[60px] flex-col items-start justify-between rounded-2xl border p-1.5 text-left transition-all sm:min-h-[86px] sm:p-2 ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/12 ring-2 ring-cyan-400/25'
                        : isToday
                          ? 'border-emerald-400/50 bg-emerald-500/8'
                          : 'border-slate-100 bg-slate-50/40 hover:border-slate-300 dark:border-white/[0.05] dark:bg-white/[0.015] dark:hover:border-white/15'
                    } ${!cell.isCurrentMonth ? 'opacity-35' : ''}`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold tabular-nums ${
                        isToday
                          ? 'bg-gradient-to-br from-emerald-400 to-cyan-400 text-slate-950 shadow-sm'
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
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                      )}
                      {scheduledCount > 0 && (
                        <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                      )}
                    </div>

                    {/* Desktop pills */}
                    <div className="hidden w-full space-y-1 sm:block">
                      {summary?.completedLogs.slice(0, 1).map((log) => (
                        <div
                          key={log.id}
                          className="truncate rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300"
                        >
                          ✓ {log.workoutName}
                        </div>
                      ))}
                      {summary?.scheduledItems.slice(0, 2).map((item) => (
                        <div
                          key={item.key}
                          className={`truncate rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                            item.origin === 'program_override'
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                              : 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                          }`}
                        >
                          {item.workout.name}
                        </div>
                      ))}
                      {completedCount + scheduledCount > 2 && (
                        <div className="text-[10px] font-semibold text-slate-400">
                          +{completedCount + scheduledCount - 2}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3.5 text-xs font-medium text-slate-500 dark:border-white/[0.06] dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Effectuée
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                Planifiée / Programme
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                Personnalisée ce jour
              </span>
            </div>
          </section>

          {/* Day Inspector */}
          <aside className="space-y-4">
            <div className="surface-card sticky top-6 space-y-5 p-5">
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                  {selectedDate === todayStr ? "Aujourd'hui" : 'Jour sélectionné'}
                </div>
                <h3 className="font-display mt-0.5 text-xl font-bold capitalize">
                  {formatLongDateFr(selectedDate)}
                </h3>
              </div>

              {selectedSummary.completedLogs.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Effectuée(s)
                  </div>
                  {selectedSummary.completedLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800 dark:text-emerald-200">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          {log.workoutName}
                        </span>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          {formatDuration(log.durationSec)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-medium text-emerald-700/80 dark:text-emerald-300/80">
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
                            {log.totalSetsCompleted} série{log.totalSetsCompleted > 1 ? 's' : ''}{' '}
                            validée{log.totalSetsCompleted > 1 ? 's' : ''}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Au programme
                </div>

                {selectedSummary.scheduledItems.length === 0 ? (
                  <div className="surface-inset border-dashed p-5 text-center">
                    <Coffee className="mx-auto h-6 w-6 text-slate-400" />
                    <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {selectedSummary.hasSkippedProgramRest
                        ? 'Passé en jour de repos pour cette date.'
                        : 'Aucune séance prévue ce jour.'}
                    </p>
                    {selectedSummary.hasSkippedProgramRest && (
                      <button
                        type="button"
                        onClick={handleRestoreSkippedPrograms}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-cyan-600 hover:underline dark:text-cyan-400"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Rétablir le programme
                      </button>
                    )}
                  </div>
                ) : (
                  selectedSummary.scheduledItems.map((item) => {
                    const accent = WORKOUT_ACCENTS[item.workout.accent ?? 'cyan'];
                    const estSec = estimateWorkoutDurationSec(item.workout, exerciseMap);
                    return (
                      <div
                        key={item.key}
                        className={`surface-inset relative overflow-hidden p-4 ${accent.border}`}
                      >
                        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent.bar}`} />
                        <span className="inline-block rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-white/[0.08] dark:text-slate-300">
                          {item.origin === 'manual'
                            ? 'Planifiée'
                            : item.origin === 'program_override'
                              ? `Personnalisée (${item.programName})`
                              : `${item.programName} · ${item.slotLabel}`}
                        </span>
                        <h4 className="font-display mt-2 text-base font-bold">
                          {item.workout.name}
                        </h4>

                        <div className="mt-1.5 flex items-center gap-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
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

                        <div className="mt-3.5 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={
                              item.workout.discipline !== 'running' &&
                              item.workout.exercises.length === 0
                            }
                            onClick={() => onStartWorkout(item.workout)}
                            className="btn-primary flex-1 px-3 py-2 text-xs"
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            Lancer
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCustomizeScheduledItem(item)}
                            className="btn-secondary px-3 py-2 text-xs"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Personnaliser
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSkipOrDeleteItem(item)}
                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 transition hover:border-rose-500/40 hover:text-rose-500 dark:border-white/10 dark:bg-white/[0.04]"
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

              <div className="border-t border-slate-100 pt-4 dark:border-white/[0.06]">
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Planifier une séance ce jour
                </label>
                <select
                  value=""
                  onChange={(e) => handleScheduleTemplate(e.target.value)}
                  className="input-field text-xs font-semibold"
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
