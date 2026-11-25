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

const RING_RADIUS = 96;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

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

  const currentItem = workout.exercises[exIndex];
  const currentExercise = currentItem ? exerciseMap.get(currentItem.exerciseId) : undefined;
  const currentSet = currentItem?.sets[setIndex];
  const unit = currentExercise?.unit ?? 'reps';

  const [actualValue, setActualValue] = useState<number>(currentSet?.target ?? 10);

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

  // Rest timer
  const [restTotalSec, setRestTotalSec] = useState(0);
  const [restRemainingSec, setRestRemainingSec] = useState(0);
  const restEndTimeRef = useRef<number | null>(null);
  const lastRestTickRef = useRef<number | null>(null);

  // Static hold timer
  const [holdRunning, setHoldRunning] = useState(false);
  const [holdRemainingSec, setHoldRemainingSec] = useState(currentSet?.target ?? 20);
  const holdEndTimeRef = useRef<number | null>(null);
  const lastHoldTickRef = useRef<number | null>(null);

  const [showOverview, setShowOverview] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [finishedLog, setFinishedLog] = useState<WorkoutSessionLog | null>(null);

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

  useEffect(() => {
    if (phase === 'summary') return;
    const startMs = new Date(startedAt).getTime();
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startMs) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [startedAt, phase]);

  useEffect(() => {
    if (currentSet) {
      setActualValue(currentSet.target);
      setHoldRemainingSec(currentSet.target);
      setHoldRunning(false);
      holdEndTimeRef.current = null;
      lastHoldTickRef.current = null;
    }
  }, [exIndex, setIndex, currentSet]);

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
      durationSec: Math.max(
        1,
        Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)
      ),
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
      <div className="mx-auto flex min-h-[88vh] max-w-2xl flex-col justify-center py-6 animate-view-in">
        <div className="surface-card relative overflow-hidden p-7 text-center sm:p-9">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative mx-auto flex h-18 w-18 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-slate-950 shadow-xl shadow-emerald-500/25">
            <Trophy className="h-9 w-9" />
          </div>
          <h1 className="font-display relative mt-5 text-3xl font-bold sm:text-4xl">
            Séance terminée !
          </h1>
          <p className="relative mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            {finishedLog.workoutName} enregistrée dans ton historique et ton calendrier.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="surface-inset p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Durée totale
              </div>
              <div className="font-display mt-1 text-2xl font-bold tabular-nums text-cyan-500">
                {formatDuration(finishedLog.durationSec)}
              </div>
            </div>
            <div className="surface-inset p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Séries validées
              </div>
              <div className="font-display mt-1 text-2xl font-bold tabular-nums text-emerald-500">
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
                  className="surface-inset flex items-center justify-between px-4 py-3 text-sm"
                >
                  <span className="font-bold">{exLog.exerciseName}</span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
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
            className="btn-primary mt-8 w-full py-4 text-base"
          >
            Retour aux séances
          </button>
        </div>
      </div>
    );
  }

  const progressPct =
    totalSetsCount > 0 ? Math.round((completedSetsCount / totalSetsCount) * 100) : 0;
  const restRatio = restTotalSec > 0 ? Math.max(0, Math.min(1, restRemainingSec / restTotalSec)) : 0;
  const restDashOffset = RING_CIRCUMFERENCE * (1 - restRatio);

  const holdTarget = currentSet?.target ?? 20;
  const holdRatio = holdTarget > 0 ? Math.max(0, Math.min(1, holdRemainingSec / holdTarget)) : 0;
  const holdDashOffset = RING_CIRCUMFERENCE * (1 - holdRatio);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-2xl flex-col justify-between pb-safe animate-view-in">
      {/* Top cockpit bar */}
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setConfirmExit(true)}
            className="btn-secondary px-3 py-2 text-xs"
          >
            <X className="h-4 w-4" />
            Quitter
          </button>

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-4 py-1.5 text-xs font-bold tabular-nums shadow-xs dark:border-white/10 dark:bg-white/[0.05]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <Clock className="h-3.5 w-3.5 text-cyan-500" />
            {formatClock(elapsedSec)}
          </div>

          <button
            type="button"
            onClick={() => setShowOverview(true)}
            className="btn-secondary px-3 py-2 text-xs"
          >
            <ListChecks className="h-4 w-4 text-cyan-500" />
            {completedSetsCount}/{totalSetsCount}
          </button>
        </div>

        {/* Session Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="truncate font-bold text-slate-800 dark:text-slate-200">
              {workout.name}
            </span>
            <span className="font-bold text-cyan-600 tabular-nums dark:text-cyan-400">
              {progressPct}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/[0.07]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main phase cockpit */}
      <main className="my-6 flex flex-1 flex-col justify-center">
        {phase === 'rest' ? (
          <div
            className={`surface-card relative overflow-hidden p-6 text-center sm:p-8 ${
              restKind === 'between_exercises'
                ? 'border-amber-500/35'
                : 'border-cyan-500/35'
            }`}
          >
            <div
              className={`pointer-events-none absolute -top-20 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full blur-3xl ${
                restKind === 'between_exercises' ? 'bg-amber-500/18' : 'bg-cyan-500/18'
              }`}
            />

            <span
              className={`relative inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-bold uppercase tracking-wider ${
                restKind === 'between_exercises'
                  ? 'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-300'
                  : 'border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {restKind === 'between_exercises'
                ? 'Repos entre exercices'
                : 'Repos entre séries'}
            </span>

            {/* Circular Countdown Ring */}
            <div className="relative mx-auto mt-6 flex h-56 w-56 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 220 220">
                <circle
                  cx="110"
                  cy="110"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-slate-200 dark:text-white/[0.07]"
                />
                <circle
                  cx="110"
                  cy="110"
                  r={RING_RADIUS}
                  fill="none"
                  stroke={restKind === 'between_exercises' ? '#f59e0b' : '#22d3ee'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={restDashOffset}
                  className="transition-all duration-200"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-display text-5xl font-bold tracking-tight tabular-nums sm:text-6xl">
                  {formatClock(restRemainingSec)}
                </div>
                <span className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  Récupération
                </span>
              </div>
            </div>

            {/* Next up card */}
            <div className="surface-inset mt-6 p-4 text-left">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Prochaine étape
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="font-display text-base font-bold">
                  {nextExercisePreview.name}
                </span>
                <span className="shrink-0 rounded-lg bg-cyan-500/15 px-2.5 py-1 text-xs font-bold text-cyan-600 dark:text-cyan-300">
                  S{nextExercisePreview.setNumber}/{nextExercisePreview.totalSets} ·{' '}
                  {nextExercisePreview.target}
                  {nextExercisePreview.unit === 'seconds' ? 's' : ' reps'}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => adjustRest(-15)}
                className="btn-secondary px-4 py-3.5 text-sm font-bold"
              >
                -15s
              </button>
              <button
                type="button"
                onClick={skipRest}
                className="btn-primary flex-1 px-6 py-3.5 text-sm"
              >
                <SkipForward className="h-4 w-4" />
                Passer le repos
              </button>
              <button
                type="button"
                onClick={() => adjustRest(15)}
                className="btn-secondary px-4 py-3.5 text-sm font-bold"
              >
                +15s
              </button>
            </div>
          </div>
        ) : (
          currentItem &&
          currentSet && (
            <div className="surface-card relative overflow-hidden p-6 sm:p-8">
              <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-cyan-500/12 blur-3xl" />

              {/* Exercise Header */}
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                      Exercice {exIndex + 1} / {workout.exercises.length}
                    </span>
                    {currentExercise && (
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                          CATEGORY_META[currentExercise.category].badgeClass
                        }`}
                      >
                        {CATEGORY_META[currentExercise.category].label}
                      </span>
                    )}
                  </div>
                  <h2 className="font-display mt-1.5 text-2xl font-bold sm:text-3xl">
                    {currentExercise?.name ?? 'Exercice'}
                  </h2>
                </div>
                {currentSet.weightKg ? (
                  <span className="shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-xs font-extrabold text-amber-600 dark:text-amber-300">
                    +{currentSet.weightKg} kg
                  </span>
                ) : null}
              </div>

              {(currentItem.notes || currentExercise?.notes) && (
                <p className="surface-inset mt-3 px-3.5 py-2 text-xs text-slate-600 dark:text-slate-400">
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
                      className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow-md shadow-cyan-500/20'
                          : done
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-white/[0.05] dark:text-slate-400'
                      }`}
                    >
                      {done && <Check className="h-3 w-3 stroke-[3]" />}
                      S{sIdx + 1}: {s.target}
                      {unit === 'seconds' ? 's' : ''}
                    </div>
                  );
                })}
              </div>

              {/* Active Target / Timer Zone */}
              <div className="surface-inset mt-6 p-6 text-center">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Série {setIndex + 1} sur {currentItem.sets.length} · Objectif{' '}
                  <span className="text-slate-900 dark:text-slate-100">
                    {currentSet.target} {unit === 'seconds' ? 'sec' : 'reps'}
                  </span>
                </div>

                {unit === 'seconds' ? (
                  <div className="mt-4 space-y-4">
                    <div className="relative mx-auto flex h-48 w-48 items-center justify-center">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 220 220">
                        <circle
                          cx="110"
                          cy="110"
                          r={RING_RADIUS}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="10"
                          className="text-slate-200 dark:text-white/[0.07]"
                        />
                        <circle
                          cx="110"
                          cy="110"
                          r={RING_RADIUS}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray={RING_CIRCUMFERENCE}
                          strokeDashoffset={holdDashOffset}
                          className="transition-all duration-150"
                        />
                      </svg>
                      <div className="font-display absolute text-5xl font-bold tracking-tight tabular-nums">
                        {formatClock(holdRemainingSec)}
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={toggleHoldTimer}
                        className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold shadow-md transition active:scale-95 ${
                          holdRunning
                            ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                            : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
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
                        className="btn-secondary p-3"
                        title="Réinitialiser"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 flex items-center justify-center gap-6">
                    <button
                      type="button"
                      onClick={() => setActualValue((v) => Math.max(0, v - 1))}
                      className="btn-secondary h-15 w-15 rounded-2xl"
                      aria-label="Diminuer les répétitions"
                    >
                      <Minus className="h-6 w-6" />
                    </button>
                    <div>
                      <div className="font-display text-7xl font-bold tracking-tight tabular-nums sm:text-8xl">
                        {actualValue}
                      </div>
                      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                        répétitions
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActualValue((v) => Math.min(999, v + 1))}
                      className="btn-secondary h-15 w-15 rounded-2xl"
                      aria-label="Augmenter les répétitions"
                    >
                      <Plus className="h-6 w-6" />
                    </button>
                  </div>
                )}
              </div>

              {/* Next rest hint */}
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
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
                    <strong className="text-slate-800 dark:text-slate-200">
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

              {/* Primary Action */}
              <button
                type="button"
                onClick={handleValidateSet}
                className="btn-primary mt-6 w-full py-4 text-base"
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="surface-card max-h-[82vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-5 pb-safe sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-cyan-500" />
                <h3 className="font-display text-lg font-bold">Plan de la séance</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOverview(false)}
                className="btn-secondary p-2"
              >
                <X className="h-4 w-4" />
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
                        ? 'border-cyan-500/50 bg-cyan-500/8'
                        : 'border-slate-200 dark:border-white/[0.07]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">
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
                          className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                            s.completed
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                              : isCurrentEx && sIdx === setIndex
                                ? 'bg-cyan-400 text-slate-950'
                                : 'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="surface-card w-full max-w-sm rounded-3xl p-6">
            <h3 className="font-display text-xl font-bold">Quitter la séance ?</h3>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
              {completedSetsCount > 0
                ? `Tu as validé ${completedSetsCount} série(s). Veux-tu sauvegarder ta progression dans l'historique ?`
                : 'Aucune série n’a encore été validée.'}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              {completedSetsCount > 0 && (
                <button
                  type="button"
                  onClick={() => finalizeWorkout(logs)}
                  className="btn-primary w-full py-3 text-sm"
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
                className="btn-secondary w-full py-3 text-sm"
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
