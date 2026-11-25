import { useEffect, useRef, useState } from 'react';
import { Check, Footprints, Pause, Play, RotateCcw, Trophy, X } from 'lucide-react';
import { RunStats, WorkoutSessionLog, WorkoutTemplate } from '../types/workout';
import { acquireWakeLock } from '../utils/feedback';
import {
  CATEGORY_META,
  formatClock,
  formatDuration,
  formatPace,
  formatSpeed,
  generateId,
} from '../utils/format';
import { RunStatsCard } from './RunStatsCard';

interface RunningPlayerProps {
  workout: WorkoutTemplate;
  onFinishSession: (log: WorkoutSessionLog) => void;
  onExit: () => void;
}

export function RunningPlayer({
  workout,
  onFinishSession,
  onExit,
}: RunningPlayerProps) {
  const [startedAt] = useState(() => new Date().toISOString());
  const [running, setRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const accumulatedMsRef = useRef(0);
  const runStartMsRef = useRef<number | null>(null);

  const [distanceKm, setDistanceKm] = useState<string>(
    String(workout.runningConfig?.targetDistanceKm ?? 5)
  );
  const [durationMin, setDurationMin] = useState<string>(
    String(Math.round((workout.runningConfig?.targetDurationSec ?? 1800) / 60))
  );
  const [useStopwatchDuration, setUseStopwatchDuration] = useState(false);
  const [finishedLog, setFinishedLog] = useState<WorkoutSessionLog | null>(null);

  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    acquireWakeLock().then((s) => {
      sentinel = s;
    });
    return () => {
      sentinel?.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!running || runStartMsRef.current === null) return;
    const id = window.setInterval(() => {
      if (runStartMsRef.current === null) return;
      const totalMs =
        accumulatedMsRef.current + (Date.now() - runStartMsRef.current);
      setElapsedSec(Math.floor(totalMs / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [running]);

  const toggleStopwatch = () => {
    if (running) {
      if (runStartMsRef.current !== null) {
        accumulatedMsRef.current += Date.now() - runStartMsRef.current;
      }
      runStartMsRef.current = null;
      setRunning(false);
      setUseStopwatchDuration(true);
    } else {
      runStartMsRef.current = Date.now();
      setRunning(true);
      setUseStopwatchDuration(true);
    }
  };

  const resetStopwatch = () => {
    setRunning(false);
    runStartMsRef.current = null;
    accumulatedMsRef.current = 0;
    setElapsedSec(0);
  };

  const handleSaveRun = () => {
    const finalElapsed =
      running && runStartMsRef.current
        ? Math.floor(
            (accumulatedMsRef.current + (Date.now() - runStartMsRef.current)) / 1000
          )
        : elapsedSec;

    const chosenDurationSec =
      useStopwatchDuration && finalElapsed > 0
        ? finalElapsed
        : Math.max(60, Math.round((Number(durationMin) || 30) * 60));

    const dist = Math.max(0.1, Number(distanceKm) || 0);
    const speedKmh = Number((dist / (chosenDurationSec / 3600)).toFixed(2));
    const paceSecPerKm = Math.round(chosenDurationSec / dist);

    const runStats: RunStats = {
      sourceFormat: 'manual',
      distanceKm: Number(dist.toFixed(2)),
      elapsedDurationSec: chosenDurationSec,
      movingDurationSec: chosenDurationSec,
      stoppedDurationSec: 0,
      avgMovingSpeedKmh: speedKmh,
      avgElapsedSpeedKmh: speedKmh,
      avgMovingPaceSecPerKm: paceSecPerKm,
      avgElapsedPaceSecPerKm: paceSecPerKm,
      splits: [],
    };

    const log: WorkoutSessionLog = {
      id: generateId('log'),
      workoutId: workout.id,
      workoutName: workout.name,
      discipline: 'running',
      startedAt,
      finishedAt: new Date().toISOString(),
      durationSec: chosenDurationSec,
      totalSetsCompleted: 1,
      exercises: [],
      runStats,
    };

    setRunning(false);
    setFinishedLog(log);
    onFinishSession(log);
  };

  const targetDist = workout.runningConfig?.targetDistanceKm;
  const targetDur = workout.runningConfig?.targetDurationSec;
  const runType = workout.runningConfig?.runType ?? 'endurance';
  const catMeta = CATEGORY_META[runType];

  const previewDist = Math.max(0, Number(distanceKm) || 0);
  const previewDurSec =
    useStopwatchDuration && elapsedSec > 0
      ? elapsedSec
      : Math.max(0, (Number(durationMin) || 0) * 60);
  const previewPace =
    previewDist > 0 && previewDurSec > 0 ? previewDurSec / previewDist : 0;
  const previewSpeed =
    previewDist > 0 && previewDurSec > 0
      ? previewDist / (previewDurSec / 3600)
      : 0;

  if (finishedLog && finishedLog.runStats) {
    return (
      <div className="mx-auto flex min-h-[88vh] max-w-2xl flex-col justify-center py-6 animate-view-in">
        <div className="surface-card relative overflow-hidden p-7 sm:p-9">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative text-center">
            <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-slate-950 shadow-xl shadow-emerald-500/25">
              <Trophy className="h-9 w-9" />
            </div>
            <h1 className="font-display mt-5 text-3xl font-bold">
              Course enregistrée !
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {finishedLog.workoutName} ajoutée à ton historique et à ton calendrier.
            </p>
          </div>

          <div className="mt-6">
            <RunStatsCard stats={finishedLog.runStats} />
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

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-xl flex-col justify-between pb-safe animate-view-in">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={onExit}
          className="btn-secondary px-3 py-2 text-xs"
        >
          <X className="h-4 w-4" />
          Quitter
        </button>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${catMeta.badgeClass}`}
        >
          <Footprints className="h-3.5 w-3.5" />
          Running · {catMeta.label}
        </span>
      </header>

      <main className="surface-card relative my-6 overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-24 right-0 h-52 w-52 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative text-center">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            {workout.name}
          </h1>
          {(targetDist || targetDur) && (
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Objectif : {targetDist ? `${targetDist} km` : 'Distance libre'}
              {targetDur ? ` · ${formatDuration(targetDur)}` : ''}
            </p>
          )}
        </div>

        {/* Stopwatch */}
        <div className="surface-inset mt-6 p-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            {running && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />}
            Chronomètre Live
          </div>
          <div className="font-display mt-2 text-6xl font-bold tracking-tight tabular-nums sm:text-7xl">
            {formatClock(elapsedSec)}
          </div>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={toggleStopwatch}
              className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold shadow-md transition active:scale-95 ${
                running
                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                  : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
              }`}
            >
              {running ? (
                <>
                  <Pause className="h-4 w-4 fill-current" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  {elapsedSec > 0 ? 'Reprendre' : 'Démarrer'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={resetStopwatch}
              className="btn-secondary p-3"
              title="Réinitialiser"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Result entry */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              Distance réalisée (km)
            </label>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              className="input-field font-display text-base font-bold tabular-nums"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              Durée (minutes){' '}
              {useStopwatchDuration && elapsedSec > 0 ? '· Chrono actif' : ''}
            </label>
            <input
              type="number"
              min={1}
              step={1}
              disabled={useStopwatchDuration && elapsedSec > 0}
              value={
                useStopwatchDuration && elapsedSec > 0
                  ? Math.max(1, Math.round(elapsedSec / 60))
                  : durationMin
              }
              onChange={(e) => {
                setUseStopwatchDuration(false);
                setDurationMin(e.target.value);
              }}
              className="input-field font-display text-base font-bold tabular-nums disabled:opacity-60"
            />
          </div>
        </div>

        {previewPace > 0 && (
          <div className="mt-4 flex items-center justify-center gap-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <span>Allure : {formatPace(previewPace)}</span>
            <span>·</span>
            <span>Vitesse : {formatSpeed(previewSpeed)}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleSaveRun}
          className="btn-primary mt-6 w-full py-4 text-base"
        >
          <Check className="h-5 w-5 stroke-[3]" />
          Enregistrer la course
        </button>
      </main>

      <div className="text-center text-xs text-slate-500">
        Pour tes temps au kilomètre et temps d&apos;arrêt exacts, importe ton fichier .GPX ou .FIT Strava.
      </div>
    </div>
  );
}
