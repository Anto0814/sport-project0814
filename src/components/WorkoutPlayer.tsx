import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  ListChecks,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  Trophy,
  X,
} from 'lucide-react';
import {
  AppSettings,
  CompletedExerciseLog,
  Exercise,
  WorkoutSessionLog,
  WorkoutTemplate,
} from '../types/workout';
import {
  acquireWakeLock,
  playFeedbackBeep,
  primeAudio,
  triggerVibration,
} from '../utils/feedback';
import { CATEGORY_META, formatClock, formatDuration, generateId } from '../utils/format';

interface WorkoutPlayerProps {
  workout: WorkoutTemplate;
  exerciseMap: Map<string, Exercise>;
  settings: AppSettings;
  onFinishSession: (log: WorkoutSessionLog) => void;
  onExit: () => void;
}

type Phase = 'work' | 'rest' | 'summary';
type RestKind = 'between_sets' | 'between_exercises';

export function WorkoutPlayer({
  workout,
  exerciseMap,
  settings,
  onFinishSession,
  onExit,
}: WorkoutPlayerProps) {
  const [startedAt] = useState(() => new Date().toISOString());
  const [elapsedSec, setElapsedSec] = useState(0);

  const [exIndex, setExIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('work');
  const [restKind, setRestKind] = useState<RestKind>('between_sets');

  // Actual value achieved for current set
  const currentItem = workout.exercises[exIndex];
  const currentExercise = currentItem ? exerciseMap.get(currentItem.exerciseId) : undefined;
  const currentSet = currentItem?.sets[setIndex];
  const unit = currentExercise?.unit ?? 'reps';

  const [actualValue, setActualValue] = useState<number>(currentSet?.target ?? 10);

  // Logs per exercise
  const [logs, setLogs] = useState<CompletedExerciseLog[]>(() =>
    workout.exercises.map((item) => {
      const ex = exerciseMap.get(item.exerciseId);
      return {
        exerciseId: item.exerciseId,
        exerciseName: ex?.name ?? 'Exercice',
        unit: ex?.unit ?? 'reps',
        sets: item.sets.map((s, idx) => ({
          setIndex: idx,
          target: s.target,
          actual: s.target,
          weightKg: s.weightKg,
          completed: false,
        })),
      };
    })
  );

  // Timestamp-driven rest countdown
  const [restTotalSec, setRestTotalSec] = useState(0);
  const [restRemainingSec, setRestRemainingSec] = useState(0);
  const restEndTimeRef = useRef<number | null>(null);
  const lastRestTickRef = useRef<number | null>(null);

  // Static hold countdown (for unit === 'seconds')
  const [holdRunning, setHoldRunning] = useState(false);
  const [holdRemainingSec, setHoldRemainingSec] = useState(currentSet?.target ?? 20);
  const holdEndTimeRef = useRef<number | null>(null);
  const lastHoldTickRef = useRef<number | null>(null);

  const [showOverview, setShowOverview] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [finishedLog, setFinishedLog] = useState<WorkoutSessionLog | null>(null);

  // Wake Lock during workout
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    acquireWakeLock().then((s) => {
      sentinel = s;
    });
    const onVis = () => {
      if (document.visibilityState === 'visible' && phase !== 'summary') {
        acquireWakeLock().then((s) => {
          sentinel = s;
        });
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      sentinel?.release().catch(() => {});
    };
  }, [phase]);

  // Global workout elapsed timer
  useEffect(() => {
    if (phase === 'summary') return;
    const startMs = new Date(startedAt).getTime();
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startMs) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [startedAt, phase]);

  // Sync target when moving to a new set
  useEffect(() => {
    if (currentSet) {
      setActualValue(currentSet.target);
      setHoldRemainingSec(currentSet.target);
      setHoldRunning(false);
      holdEndTimeRef.current = null;
      lastHoldTickRef.current = null;
    }
  }, [exIndex, setIndex, currentSet]);

  // Rest timer loop
  useEffect(() => {
    if (phase !== 'rest' || restEndTimeRef.current === null) return;

    const tick = () => {
      if (restEndTimeRef.current === null) return;
      const diffMs = restEndTimeRef.current - Date.now();
      const rem = Math.max(0, Math.ceil(diffMs / 1000));
      setRestRemainingSec(rem);

      if (rem > 0 && rem <= 3 && lastRestTickRef.current !== rem) {
        lastRestTickRef.current = rem;
        playFeedbackBeep('tick', settings.soundEnabled);
      }

      if (diffMs <= 0) {
        restEndTimeRef.current = null;
        lastRestTickRef.current = null;
        playFeedbackBeep('restDone', settings.soundEnabled);
        triggerVibration([150, 80, 150], settings.vibrationEnabled);
        setPhase('work');
      }
    };

    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [phase, settings.soundEnabled, settings.vibrationEnabled]);

  // Static hold timer loop
  useEffect(() => {
    if (!holdRunning || holdEndTimeRef.current === null) return;

    const tick = () => {
      if (holdEndTimeRef.current === null) return;
      const diffMs = holdEndTimeRef.current - Date.now();
      const rem = Math.max(0, Math.ceil(diffMs / 1000));
      setHoldRemainingSec(rem);

      if (rem > 0 && rem <= 3 && lastHoldTickRef.current !== rem) {
        lastHoldTickRef.current = rem;
        playFeedbackBeep('tick', settings.soundEnabled);
      }

      if (diffMs <= 0) {
        holdEndTimeRef.current = null;
        lastHoldTickRef.current = null;
        setHoldRunning(false);
        playFeedbackBeep('holdDone', settings.soundEnabled);
        triggerVibration([200, 100, 200], settings.vibrationEnabled);
      }
    };

    tick();
    const id = window.setInterval(tick, 150);
    return () => window.clearInterval(id);
  }, [holdRunning, settings.soundEnabled, settings.vibrationEnabled]);

  const totalSetsCount = useMemo(
    () => workout.exercises.reduce((acc, item) => acc + item.sets.length, 0),
    [workout.exercises]
  );

  const completedSetsCount = useMemo(
    () =>
      logs.reduce(
        (acc, exLog) => acc + exLog.sets.filter((s) => s.completed).length,
        0
      ),
    [logs]
  );

  const nextExercisePreview = useMemo(() => {
    if (restKind === 'between_sets') {
      return {
        name: currentExercise?.name ?? '',
        setNumber: setIndex + 1,
        totalSets: currentItem?.sets.length ?? 0,
        target: currentSet?.target ?? 0,
        unit,
      };
    }
    const nextItem = workout.exercises[exIndex];
    const nextEx = nextItem ? exerciseMap.get(nextItem.exerciseId) : undefined;
    return {
      name: nextEx?.name ?? '',
      setNumber: 1,
      totalSets: nextItem?.sets.length ?? 0,
      target: nextItem?.sets[0]?.target ?? 0,
      unit: nextEx?.unit ?? 'reps',
    };
  }, [
    restKind,
    currentExercise,
    currentItem,
    currentSet,
    setIndex,
    exIndex,
    unit,
    workout.exercises,
    exerciseMap,
  ]);

  const finalizeWorkout = (updatedLogs: CompletedExerciseLog[]) => {
    const finishedAt = new Date().toISOString();
    const totalCompleted = updatedLogs.reduce(
      (acc, exLog) => acc + exLog.sets.filter((s) => s.completed).length,
      0
    );
    const sessionLog: WorkoutSessionLog = {
      id: generateId('log'),
      workoutId: workout.id,
      workoutName: workout.name,
      discipline: 'street_workout',
      startedAt,
      finishedAt,
      durationSec: Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)),
      totalSetsCompleted: totalCompleted,
      exercises: updatedLogs,
    };
    setFinishedLog(sessionLog);
    setPhase('summary');
    onFinishSession(sessionLog);
  };

  const handleValidateSet = () => {
    primeAudio();
    setHoldRunning(false);
    holdEndTimeRef.current = null;

    const updatedLogs = logs.map((exLog, eIdx) => {
      if (eIdx !== exIndex) return exLog;
      return {
        ...exLog,
        sets: exLog.sets.map((s, sIdx) =>
          sIdx === setIndex ? { ...s, actual: actualValue, completed: true } : s
        ),
      };
    });
    setLogs(updatedLogs);

    const hasMoreSetsInExercise = setIndex + 1 < currentItem.sets.length;
    const hasMoreExercises = exIndex + 1 < workout.exercises.length;

    if (hasMoreSetsInExercise) {
      const restSec = currentItem.restBetweenSetsSec;
      setSetIndex(setIndex + 1);
      if (restSec > 0) {
        setRestKind('between_sets');
        setRestTotalSec(restSec);
        setRestRemainingSec(restSec);
        restEndTimeRef.current = Date.now() + restSec * 1000;
        lastRestTickRef.current = null;
        setPhase('rest');
      }
      return;
    }

    if (hasMoreExercises) {
      const restSec = currentItem.restAfterExerciseSec;
      setExIndex(exIndex + 1);
      setSetIndex(0);
      if (restSec > 0) {
        setRestKind('between_exercises');
        setRestTotalSec(restSec);
        setRestRemainingSec(restSec);
        restEndTimeRef.current = Date.now() + restSec * 1000;
        lastRestTickRef.current = null;
        setPhase('rest');
      }
      return;
    }

    // All exercises & sets finished!
    playFeedbackBeep('holdDone', settings.soundEnabled);
    triggerVibration([200, 100, 200], settings.vibrationEnabled);
    finalizeWorkout(updatedLogs);
  };

  const adjustRest = (deltaSec: number) => {
    if (restEndTimeRef.current === null) return;
    const nextEnd = Math.max(Date.now() + 1000, restEndTimeRef.current + deltaSec * 1000);
    restEndTimeRef.current = nextEnd;
    const rem = Math.max(1, Math.ceil((nextEnd - Date.now()) / 1000));
    setRestRemainingSec(rem);
    if (rem > restTotalSec) {
      setRestTotalSec(rem);
    }
  };

  const skipRest = () => {
    restEndTimeRef.current = null;
    lastRestTickRef.current = null;
    setPhase('work');
  };

  const toggleHoldTimer = () => {
    primeAudio();
    if (holdRunning) {
      setHoldRunning(false);
      holdEndTimeRef.current = null;
    } else {
      const base = holdRemainingSec > 0 ? holdRemainingSec : currentSet?.target ?? 20;
      holdEndTimeRef.current = Date.now() + base * 1000;
      lastHoldTickRef.current = null;
      setHoldRunning(true);
    }
  };

  const resetHoldTimer = () => {
    setHoldRunning(false);
    holdEndTimeRef.current = null;
    lastHoldTickRef.current = null;
    setHoldRemainingSec(currentSet?.target ?? 20);
  };

  if (phase === 'summary' && finishedLog) {
    return (
      <div className="mx-auto flex min-h-[85vh] max-w-2xl flex-col justify-center py-6">
        <div className="rounded-3xl border border-emerald-500/30 bg-white p-6 text-center shadow-xl sm:p-8 dark:bg-slate-900">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
            <Trophy className="h-9 w-9" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">Séance terminée !</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {finishedLog.workoutName} enregistrée dans ton historique.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-950">
              <div className="text-xs font-medium text-slate-500">Durée totale</div>
              <div className="mt-1 text-xl font-bold tabular-nums">
                {formatDuration(finishedLog.durationSec)}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-950">
              <div className="text-xs font-medium text-slate-500">Séries validées</div>
              <div className="mt-1 text-xl font-bold tabular-nums">
                {finishedLog.totalSetsCompleted} / {totalSetsCount}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2 text-left">
            {finishedLog.exercises.map((exLog, idx) => {
              const doneSets = exLog.sets.filter((s) => s.completed);
              if (doneSets.length === 0) return null;
              return (
                <div
                  key={`${exLog.exerciseId}_${idx}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5 text-sm dark:border-slate-800"
                >
                  <span className="font-semibold">{exLog.exerciseName}</span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {doneSets
                      .map((s) => `${s.actual}${exLog.unit === 'seconds' ? 's' : ''}`)
                      .join(' · ')}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onExit}
            className="mt-8 w-full rounded-2xl bg-emerald-500 py-4 text-base font-bold text-slate-950 transition hover:bg-emerald-400"
          >
            Retour aux séances
          </button>
        </div>
      </div>
    );
  }

  const progressPct = totalSetsCount > 0 ? Math.round((completedSetsCount / totalSetsCount) * 100) : 0;
  const restProgressPct =
    restTotalSec > 0 ? Math.max(0, Math.min(100, (restRemainingSec / restTotalSec) * 100)) : 0;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-2xl flex-col justify-between pb-safe">
      {/* Top bar */}
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setConfirmExit(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
            Quitter
          </button>

          <div className="flex items-center gap-2 rounded-xl bg-slate-200/70 px-3 py-1.5 text-xs font-semibold tabular-nums dark:bg-slate-900">
            <Clock className="h-3.5 w-3.5 text-cyan-500" />
            {formatClock(elapsedSec)}
          </div>

          <button
            type="button"
            onClick={() => setShowOverview(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ListChecks className="h-4 w-4" />
            Plan ({completedSetsCount}/{totalSetsCount})
          </button>
        </div>

        {/* Overall session progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
              {workout.name}
            </span>
            <span className="tabular-nums">{progressPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main phase card */}
      <main className="my-6 flex flex-1 flex-col justify-center">
        {phase === 'rest' ? (
          <div
            className={`rounded-3xl border p-6 text-center shadow-lg sm:p-8 ${
              restKind === 'between_exercises'
                ? 'border-amber-500/40 bg-amber-500/5 dark:bg-slate-900'
                : 'border-cyan-500/40 bg-cyan-500/5 dark:bg-slate-900'
            }`}
          >
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider ${
                restKind === 'between_exercises'
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                  : 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {restKind === 'between_exercises'
                ? 'Repos entre exercices'
                : 'Repos entre séries'}
            </span>

            <div className="mt-6 text-7xl font-black tracking-tight tabular-nums sm:text-8xl">
              {formatClock(restRemainingSec)}
            </div>

            <div className="mx-auto mt-5 h-2.5 max-w-sm overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  restKind === 'between_exercises' ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${restProgressPct}%` }}
              />
            </div>

            {/* Next up preview */}
            <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-left dark:border-slate-800 dark:bg-slate-950/70">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                À suivre
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {nextExercisePreview.name}
                </span>
                <span className="shrink-0 text-sm font-semibold text-cyan-600 dark:text-cyan-400">
                  Série {nextExercisePreview.setNumber}/{nextExercisePreview.totalSets} ·{' '}
                  {nextExercisePreview.target}
                  {nextExercisePreview.unit === 'seconds' ? 's' : ' reps'}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => adjustRest(-15)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold hover:bg-slate-100 active:scale-95 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800"
              >
                -15s
              </button>
              <button
                type="button"
                onClick={skipRest}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white hover:bg-slate-800 active:scale-95 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
              >
                <SkipForward className="h-4 w-4" />
                Passer le repos
              </button>
              <button
                type="button"
                onClick={() => adjustRest(15)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold hover:bg-slate-100 active:scale-95 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800"
              >
                +15s
              </button>
            </div>
          </div>
        ) : (
          currentItem &&
          currentSet && (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg sm:p-8 dark:border-slate-800 dark:bg-slate-900">
              {/* Exercise title & metadata */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                      Exercice {exIndex + 1} / {workout.exercises.length}
                    </span>
                    {currentExercise && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          CATEGORY_META[currentExercise.category].badgeClass
                        }`}
                      >
                        {CATEGORY_META[currentExercise.category].label}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1.5 text-2xl font-extrabold sm:text-3xl">
                    {currentExercise?.name ?? 'Exercice'}
                  </h2>
                </div>
                {currentSet.weightKg ? (
                  <span className="shrink-0 rounded-xl bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-300">
                    +{currentSet.weightKg} kg
                  </span>
                ) : null}
              </div>

              {(currentItem.notes || currentExercise?.notes) && (
                <p className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-400">
                  {currentItem.notes ?? currentExercise?.notes}
                </p>
              )}

              {/* Set pills */}
              <div className="mt-5 flex flex-wrap gap-2">
                {currentItem.sets.map((s, sIdx) => {
                  const done = logs[exIndex]?.sets[sIdx]?.completed;
                  const isCurrent = sIdx === setIndex;
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                        isCurrent
                          ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-400/50'
                          : done
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {done && <Check className="h-3 w-3" />}
                      S{sIdx + 1}: {s.target}
                      {unit === 'seconds' ? 's' : ''}
                    </div>
                  );
                })}
              </div>

              {/* Target & interactive control */}
              <div className="mt-7 rounded-2xl bg-slate-50 p-5 text-center dark:bg-slate-950">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Série {setIndex + 1} sur {currentItem.sets.length} · Objectif :{' '}
                  {currentSet.target} {unit === 'seconds' ? 'secondes' : 'répétitions'}
                </div>

                {unit === 'seconds' ? (
                  <div className="mt-4 space-y-4">
                    <div className="text-6xl font-black tracking-tight tabular-nums sm:text-7xl">
                      {formatClock(holdRemainingSec)}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={toggleHoldTimer}
                        className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold transition active:scale-95 ${
                          holdRunning
                            ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                            : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                        }`}
                      >
                        {holdRunning ? (
                          <>
                            <Pause className="h-4 w-4 fill-current" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 fill-current" />
                            Lancer le maintien
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={resetHoldTimer}
                        className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                        title="Réinitialiser le chrono"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center justify-center gap-5">
                    <button
                      type="button"
                      onClick={() => setActualValue((v) => Math.max(0, v - 1))}
                      className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-xs active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                      aria-label="Diminuer les répétitions"
                    >
                      <Minus className="h-6 w-6" />
                    </button>
                    <div>
                      <div className="text-6xl font-black tracking-tight tabular-nums sm:text-7xl">
                        {actualValue}
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        reps réalisées
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActualValue((v) => Math.min(999, v + 1))}
                      className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-xs active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                      aria-label="Augmenter les répétitions"
                    >
                      <Plus className="h-6 w-6" />
                    </button>
                  </div>
                )}
              </div>

              {/* Next rest info */}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <ChevronRight className="h-3.5 w-3.5" />
                {setIndex + 1 < currentItem.sets.length ? (
                  <span>
                    Repos après cette série :{' '}
                    <strong className="text-cyan-600 dark:text-cyan-400">
                      {formatDuration(currentItem.restBetweenSetsSec)}
                    </strong>
                  </span>
                ) : exIndex + 1 < workout.exercises.length ? (
                  <span>
                    Dernière série · Repos avant{' '}
                    <strong className="text-slate-700 dark:text-slate-200">
                      {exerciseMap.get(workout.exercises[exIndex + 1].exerciseId)?.name}
                    </strong>{' '}
                    :{' '}
                    <strong className="text-amber-600 dark:text-amber-400">
                      {formatDuration(currentItem.restAfterExerciseSec)}
                    </strong>
                  </span>
                ) : (
                  <span>Dernière série de la séance !</span>
                )}
              </div>

              {/* Primary CTA */}
              <button
                type="button"
                onClick={handleValidateSet}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-base font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-[0.98]"
              >
                <Check className="h-5 w-5 stroke-[3]" />
                Valider la série {setIndex + 1}
              </button>
            </div>
          )
        )}
      </main>

      {/* Session overview modal */}
      {showOverview && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="max-h-[82vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 pb-safe sm:rounded-3xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-cyan-500" />
                <h3 className="text-lg font-bold">Plan de la séance</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOverview(false)}
                className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {workout.exercises.map((item, eIdx) => {
                const ex = exerciseMap.get(item.exerciseId);
                const log = logs[eIdx];
                const isCurrentEx = eIdx === exIndex;
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-3.5 ${
                      isCurrentEx
                        ? 'border-cyan-500/60 bg-cyan-500/5'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {eIdx + 1}. {ex?.name ?? 'Exercice'}
                      </span>
                      <span className="text-xs text-slate-500">
                        Repos : {formatDuration(item.restBetweenSetsSec)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {log?.sets.map((s, sIdx) => (
                        <span
                          key={sIdx}
                          className={`rounded-lg px-2 py-1 text-xs font-medium ${
                            s.completed
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                              : isCurrentEx && sIdx === setIndex
                                ? 'bg-cyan-500 text-slate-950'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          S{sIdx + 1}: {s.completed ? s.actual : s.target}
                          {ex?.unit === 'seconds' ? 's' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Exit confirmation modal */}
      {confirmExit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-bold">Quitter la séance ?</h3>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
              {completedSetsCount > 0
                ? `Tu as déjà validé ${completedSetsCount} série(s). Veux-tu sauvegarder ta progression dans l'historique ?`
                : 'Aucune série n’a encore été validée.'}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              {completedSetsCount > 0 && (
                <button
                  type="button"
                  onClick={() => finalizeWorkout(logs)}
                  className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400"
                >
                  Terminer et sauvegarder
                </button>
              )}
              <button
                type="button"
                onClick={onExit}
                className="w-full rounded-xl bg-rose-600 py-3 text-sm font-bold text-white hover:bg-rose-500"
              >
                Quitter sans sauvegarder
              </button>
              <button
                type="button"
                onClick={() => setConfirmExit(false)}
                className="w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
              >
                Continuer la séance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
