import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_APP_DATA } from '../data/defaults';
import {
  AppData,
  AppSettings,
  Exercise,
  PlannedWorkout,
  WorkoutProgram,
  WorkoutSessionLog,
  WorkoutTemplate,
} from '../types/workout';
import { generateId } from '../utils/format';

const STORAGE_KEY = 'streetflow_app_data_v1';

function normalizeData(parsed: Partial<AppData>): AppData {
  const rawExercises = Array.isArray(parsed.exercises)
    ? parsed.exercises.map((e) => ({
        ...e,
        discipline: e.discipline ?? 'street_workout',
      }))
    : DEFAULT_APP_DATA.exercises;

  const rawWorkouts = Array.isArray(parsed.workouts)
    ? parsed.workouts.map((w) => ({
        ...w,
        discipline: w.discipline ?? 'street_workout',
      }))
    : DEFAULT_APP_DATA.workouts;

  const rawHistory = Array.isArray(parsed.history)
    ? parsed.history.map((h) => ({
        ...h,
        discipline: h.discipline ?? (h.runStats ? 'running' : 'street_workout'),
      }))
    : [];

  return {
    version: 1,
    settings: {
      ...DEFAULT_APP_DATA.settings,
      ...(parsed.settings ?? {}),
    },
    exercises: rawExercises,
    workouts: rawWorkouts,
    history: rawHistory,
    plannedWorkouts: Array.isArray(parsed.plannedWorkouts)
      ? parsed.plannedWorkouts
      : [],
    programs: Array.isArray(parsed.programs) ? parsed.programs : [],
  };
}

function loadInitialData(): AppData {
  if (typeof window === 'undefined') return DEFAULT_APP_DATA;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APP_DATA;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_APP_DATA;
    return normalizeData(parsed);
  } catch {
    return DEFAULT_APP_DATA;
  }
}

export function useAppStore() {
  const [data, setData] = useState<AppData>(loadInitialData);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore quota errors cleanly
    }
  }, [data]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', data.settings.theme === 'dark');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute(
        'content',
        data.settings.theme === 'dark' ? '#070a0f' : '#f4f6fa'
      );
    }
  }, [data.settings.theme]);

  const exerciseMap = useMemo(
    () => new Map(data.exercises.map((ex) => [ex.id, ex])),
    [data.exercises]
  );

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  }, []);

  const saveWorkout = useCallback((workout: WorkoutTemplate) => {
    const timestamp = new Date().toISOString();
    setData((prev) => {
      const exists = prev.workouts.some((w) => w.id === workout.id);
      const nextWorkouts = exists
        ? prev.workouts.map((w) =>
            w.id === workout.id ? { ...workout, updatedAt: timestamp } : w
          )
        : [{ ...workout, createdAt: timestamp, updatedAt: timestamp }, ...prev.workouts];
      return { ...prev, workouts: nextWorkouts };
    });
  }, []);

  const duplicateWorkout = useCallback((workoutId: string) => {
    const timestamp = new Date().toISOString();
    setData((prev) => {
      const source = prev.workouts.find((w) => w.id === workoutId);
      if (!source) return prev;
      const copy: WorkoutTemplate = {
        ...source,
        id: generateId('wk'),
        name: `${source.name} (copie)`,
        createdAt: timestamp,
        updatedAt: timestamp,
        exercises: source.exercises.map((item) => ({
          ...item,
          id: generateId('wex'),
          sets: item.sets.map((s) => ({ ...s, id: generateId('s') })),
        })),
      };
      return { ...prev, workouts: [copy, ...prev.workouts] };
    });
  }, []);

  const deleteWorkout = useCallback((workoutId: string) => {
    setData((prev) => ({
      ...prev,
      workouts: prev.workouts.filter((w) => w.id !== workoutId),
    }));
  }, []);

  const saveExercise = useCallback((exercise: Exercise) => {
    setData((prev) => {
      const exists = prev.exercises.some((e) => e.id === exercise.id);
      const nextExercises = exists
        ? prev.exercises.map((e) => (e.id === exercise.id ? exercise : e))
        : [...prev.exercises, { ...exercise, isCustom: true }];
      return { ...prev, exercises: nextExercises };
    });
  }, []);

  const deleteExercise = useCallback((exerciseId: string) => {
    setData((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((e) => e.id !== exerciseId),
      workouts: prev.workouts.map((w) => ({
        ...w,
        exercises: w.exercises.filter((item) => item.exerciseId !== exerciseId),
      })),
    }));
  }, []);

  const addSessionLog = useCallback((log: WorkoutSessionLog) => {
    setData((prev) => ({
      ...prev,
      history: [log, ...prev.history].sort(
        (a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
      ),
    }));
  }, []);

  const deleteSessionLog = useCallback((logId: string) => {
    setData((prev) => ({
      ...prev,
      history: prev.history.filter((h) => h.id !== logId),
    }));
  }, []);

  const savePlannedWorkout = useCallback((planned: PlannedWorkout) => {
    setData((prev) => {
      const exists = prev.plannedWorkouts.some((p) => p.id === planned.id);
      const next = exists
        ? prev.plannedWorkouts.map((p) => (p.id === planned.id ? planned : p))
        : [...prev.plannedWorkouts, planned];
      return { ...prev, plannedWorkouts: next };
    });
  }, []);

  const deletePlannedWorkout = useCallback((plannedId: string) => {
    setData((prev) => ({
      ...prev,
      plannedWorkouts: prev.plannedWorkouts.filter((p) => p.id !== plannedId),
    }));
  }, []);

  const saveProgram = useCallback((program: WorkoutProgram) => {
    const timestamp = new Date().toISOString();
    setData((prev) => {
      const exists = prev.programs.some((p) => p.id === program.id);
      const next = exists
        ? prev.programs.map((p) =>
            p.id === program.id ? { ...program, updatedAt: timestamp } : p
          )
        : [{ ...program, createdAt: timestamp, updatedAt: timestamp }, ...prev.programs];
      return { ...prev, programs: next };
    });
  }, []);

  const toggleProgramActive = useCallback((programId: string) => {
    setData((prev) => ({
      ...prev,
      programs: prev.programs.map((p) =>
        p.id === programId ? { ...p, isActive: !p.isActive } : p
      ),
    }));
  }, []);

  const deleteProgram = useCallback((programId: string) => {
    setData((prev) => ({
      ...prev,
      programs: prev.programs.filter((p) => p.id !== programId),
      plannedWorkouts: prev.plannedWorkouts.filter(
        (pw) => pw.sourceProgramId !== programId
      ),
    }));
  }, []);

  const exportDataJson = useCallback(() => {
    const payload = JSON.stringify(data, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateTag = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `streetflow-sauvegarde-${dateTag}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const importDataJson = useCallback(
    (rawJson: string, mode: 'replace' | 'merge'): { ok: boolean; message: string } => {
      try {
        const parsed = JSON.parse(rawJson) as Partial<AppData>;
        if (
          !parsed ||
          typeof parsed !== 'object' ||
          !Array.isArray(parsed.exercises) ||
          !Array.isArray(parsed.workouts)
        ) {
          return {
            ok: false,
            message: 'Fichier invalide : format StreetFlow non reconnu.',
          };
        }

        if (mode === 'replace') {
          const normalized = normalizeData(parsed);
          setData(normalized);
          return {
            ok: true,
            message: `Données restaurées (${normalized.workouts.length} séances, ${normalized.exercises.length} exercices).`,
          };
        }

        setData((prev) => {
          const exIds = new Set(prev.exercises.map((e) => e.id));
          const wkIds = new Set(prev.workouts.map((w) => w.id));
          const histIds = new Set(prev.history.map((h) => h.id));
          const plannedIds = new Set(prev.plannedWorkouts.map((p) => p.id));
          const progIds = new Set(prev.programs.map((p) => p.id));

          const newExercises = parsed.exercises!.filter((e) => !exIds.has(e.id));
          const newWorkouts = parsed.workouts!.filter((w) => !wkIds.has(w.id));
          const newHistory = (parsed.history ?? []).filter((h) => !histIds.has(h.id));
          const newPlanned = (parsed.plannedWorkouts ?? []).filter(
            (p) => !plannedIds.has(p.id)
          );
          const newPrograms = (parsed.programs ?? []).filter((p) => !progIds.has(p.id));

          return {
            ...prev,
            exercises: [...prev.exercises, ...newExercises],
            workouts: [...newWorkouts, ...prev.workouts],
            history: [...newHistory, ...prev.history].sort(
              (a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
            ),
            plannedWorkouts: [...prev.plannedWorkouts, ...newPlanned],
            programs: [...prev.programs, ...newPrograms],
          };
        });
        return { ok: true, message: 'Importation fusionnée avec succès.' };
      } catch {
        return { ok: false, message: 'Impossible de lire le fichier JSON.' };
      }
    },
    []
  );

  const resetToDefaults = useCallback(() => {
    setData((prev) => ({
      ...DEFAULT_APP_DATA,
      settings: prev.settings,
    }));
  }, []);

  return {
    data,
    exerciseMap,
    updateSettings,
    saveWorkout,
    duplicateWorkout,
    deleteWorkout,
    saveExercise,
    deleteExercise,
    addSessionLog,
    deleteSessionLog,
    savePlannedWorkout,
    deletePlannedWorkout,
    saveProgram,
    toggleProgramActive,
    deleteProgram,
    exportDataJson,
    importDataJson,
    resetToDefaults,
  };
}
