import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Clock,
  CopyCheck,
  Dumbbell,
  Footprints,
  Minus,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  Discipline,
  Exercise,
  ExerciseCategory,
  ExerciseUnit,
  RunningCategory,
  WorkoutExercise,
  WorkoutTemplate,
} from '../types/workout';
import {
  CATEGORY_META,
  estimateWorkoutDurationSec,
  formatDuration,
  formatPace,
  formatSpeed,
  generateId,
  RUNNING_CATEGORIES,
  STREET_CATEGORIES,
  WORKOUT_ACCENTS,
} from '../utils/format';

interface WorkoutEditorProps {
  initialWorkout: WorkoutTemplate | null;
  exercises: Exercise[];
  exerciseMap: Map<string, Exercise>;
  onSaveWorkout: (workout: WorkoutTemplate) => void;
  onSaveExercise: (exercise: Exercise) => void;
  onCancel: () => void;
  titleOverride?: string;
  contextBadge?: string;
}

const REST_SET_PRESETS = [45, 60, 90, 120, 180];
const REST_EXO_PRESETS = [60, 90, 120, 180, 240];
const ACCENTS = Object.keys(WORKOUT_ACCENTS) as NonNullable<WorkoutTemplate['accent']>[];

export function WorkoutEditor({
  initialWorkout,
  exercises,
  exerciseMap,
  onSaveWorkout,
  onSaveExercise,
  onCancel,
  titleOverride,
  contextBadge,
}: WorkoutEditorProps) {
  const [discipline, setDiscipline] = useState<Discipline>(
    initialWorkout?.discipline ?? 'street_workout'
  );
  const [name, setName] = useState(initialWorkout?.name ?? '');
  const [description, setDescription] = useState(initialWorkout?.description ?? '');
  const [accent, setAccent] = useState<NonNullable<WorkoutTemplate['accent']>>(
    initialWorkout?.accent ?? 'cyan'
  );
  const [items, setItems] = useState<WorkoutExercise[]>(
    initialWorkout?.exercises ?? []
  );

  // Running fields
  const [runType, setRunType] = useState<RunningCategory>(
    initialWorkout?.runningConfig?.runType ?? 'endurance'
  );
  const [targetDistanceKm, setTargetDistanceKm] = useState<string>(
    initialWorkout?.runningConfig?.targetDistanceKm !== undefined
      ? String(initialWorkout.runningConfig.targetDistanceKm)
      : '8'
  );
  const [targetDurationMin, setTargetDurationMin] = useState<string>(
    initialWorkout?.runningConfig?.targetDurationSec !== undefined
      ? String(Math.round(initialWorkout.runningConfig.targetDurationSec / 60))
      : '45'
  );
  const [runNotes, setRunNotes] = useState(initialWorkout?.runningConfig?.notes ?? '');

  // Exercise picker state
  const [pickerOpenMobile, setPickerOpenMobile] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickExName, setQuickExName] = useState('');
  const [quickExUnit, setQuickExUnit] = useState<ExerciseUnit>('reps');
  const [quickExCat, setQuickExCat] = useState<ExerciseCategory>('push');
  const [errorMsg, setErrorMsg] = useState('');

  const parsedRunDist = Math.max(0, Number(targetDistanceKm) || 0);
  const parsedRunDurSec = Math.max(
    0,
    Math.round((Number(targetDurationMin) || 0) * 60)
  );

  const draftWorkout: WorkoutTemplate = useMemo(
    () => ({
      id: initialWorkout?.id ?? generateId('wk'),
      name: name.trim() || 'Nouvelle séance',
      discipline,
      description: description.trim() || undefined,
      accent,
      exercises: discipline === 'street_workout' ? items : [],
      runningConfig:
        discipline === 'running'
          ? {
              runType,
              targetDistanceKm: parsedRunDist > 0 ? parsedRunDist : undefined,
              targetDurationSec: parsedRunDurSec > 0 ? parsedRunDurSec : undefined,
              notes: runNotes.trim() || undefined,
            }
          : undefined,
      createdAt: initialWorkout?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [
      initialWorkout,
      name,
      discipline,
      description,
      accent,
      items,
      runType,
      parsedRunDist,
      parsedRunDurSec,
      runNotes,
    ]
  );

  const totalSets = useMemo(
    () => items.reduce((acc, item) => acc + item.sets.length, 0),
    [items]
  );

  const estimatedSec = useMemo(
    () => estimateWorkoutDurationSec(draftWorkout, exerciseMap),
    [draftWorkout, exerciseMap]
  );

  const filteredPickerExercises = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (ex.discipline !== 'street_workout') return false;
      if (q && !ex.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [exercises, pickerQuery]);

  const addExerciseToWorkout = (ex: Exercise) => {
    const defaultTarget = ex.unit === 'seconds' ? 20 : 10;
    const newItem: WorkoutExercise = {
      id: generateId('wex'),
      exerciseId: ex.id,
      sets: [
        { id: generateId('s'), target: defaultTarget },
        { id: generateId('s'), target: defaultTarget },
        { id: generateId('s'), target: defaultTarget },
      ],
      restBetweenSetsSec: 90,
      restAfterExerciseSec: 150,
    };
    setItems((prev) => [...prev, newItem]);
    setPickerOpenMobile(false);
    setErrorMsg('');
  };

  const handleQuickCreateExercise = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickExName.trim();
    if (!trimmed) return;
    const created: Exercise = {
      id: generateId('ex'),
      name: trimmed,
      discipline: 'street_workout',
      unit: quickExUnit,
      category: quickExCat,
      isCustom: true,
    };
    onSaveExercise(created);
    addExerciseToWorkout(created);
    setQuickExName('');
    setShowQuickCreate(false);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (
    id: string,
    updater: (item: WorkoutExercise) => WorkoutExercise
  ) => {
    setItems((prev) => prev.map((item) => (item.id === id ? updater(item) : item)));
  };

  const changeSetCount = (itemId: string, delta: number) => {
    updateItem(itemId, (item) => {
      const nextCount = Math.max(1, Math.min(20, item.sets.length + delta));
      if (nextCount === item.sets.length) return item;
      if (nextCount > item.sets.length) {
        const last = item.sets[item.sets.length - 1] ?? { target: 10 };
        const extra = Array.from({ length: nextCount - item.sets.length }, () => ({
          id: generateId('s'),
          target: last.target,
          weightKg: last.weightKg,
        }));
        return { ...item, sets: [...item.sets, ...extra] };
      }
      return { ...item, sets: item.sets.slice(0, nextCount) };
    });
  };

  const updateSetTarget = (itemId: string, setIndex: number, value: number) => {
    const safe = Math.max(1, Math.min(999, Math.round(value) || 1));
    updateItem(itemId, (item) => ({
      ...item,
      sets: item.sets.map((s, idx) => (idx === setIndex ? { ...s, target: safe } : s)),
    }));
  };

  const updateSetWeight = (itemId: string, setIndex: number, raw: string) => {
    const parsed = raw === '' ? undefined : Math.max(0, Number(raw));
    updateItem(itemId, (item) => ({
      ...item,
      sets: item.sets.map((s, idx) =>
        idx === setIndex
          ? { ...s, weightKg: parsed && !Number.isNaN(parsed) ? parsed : undefined }
          : s
      ),
    }));
  };

  const applyFirstSetToAll = (itemId: string) => {
    updateItem(itemId, (item) => {
      if (item.sets.length === 0) return item;
      const first = item.sets[0];
      return {
        ...item,
        sets: item.sets.map((s) => ({
          ...s,
          target: first.target,
          weightKg: first.weightKg,
        })),
      };
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      setErrorMsg('Donne un nom à ta séance avant d’enregistrer.');
      return;
    }
    if (discipline === 'street_workout' && items.length === 0) {
      setErrorMsg('Ajoute au moins un exercice à la séance.');
      return;
    }
    if (discipline === 'running' && parsedRunDist <= 0 && parsedRunDurSec <= 0) {
      setErrorMsg('Indique au moins une distance ou une durée pour ta course.');
      return;
    }
    onSaveWorkout(draftWorkout);
  };

  const pickerPanel = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
          Ajouter un exercice
        </h3>
        <button
          type="button"
          onClick={() => setShowQuickCreate((v) => !v)}
          className="text-xs font-bold text-cyan-600 hover:underline dark:text-cyan-400"
        >
          {showQuickCreate ? 'Fermer' : '+ Créer'}
        </button>
      </div>

      {showQuickCreate && (
        <form
          onSubmit={handleQuickCreateExercise}
          className="space-y-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/8 p-3"
        >
          <input
            type="text"
            required
            value={quickExName}
            onChange={(e) => setQuickExName(e.target.value)}
            placeholder="Nom de l'exercice..."
            className="input-field py-2 text-xs"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={quickExUnit}
              onChange={(e) => setQuickExUnit(e.target.value as ExerciseUnit)}
              className="input-field py-2 text-xs"
            >
              <option value="reps">Répétitions</option>
              <option value="seconds">Secondes</option>
            </select>
            <select
              value={quickExCat}
              onChange={(e) => setQuickExCat(e.target.value as ExerciseCategory)}
              className="input-field py-2 text-xs"
            >
              {STREET_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_META[cat].label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary w-full py-2 text-xs">
            Créer et ajouter
          </button>
        </form>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={pickerQuery}
          onChange={(e) => setPickerQuery(e.target.value)}
          placeholder="Rechercher..."
          className="input-field py-2 pl-9 text-xs"
        />
      </div>

      <div className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
        {filteredPickerExercises.map((ex) => {
          const meta = CATEGORY_META[ex.category];
          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => addExerciseToWorkout(ex)}
              className="surface-inset flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:border-cyan-400/50 hover:bg-cyan-500/10"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{ex.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{meta.label}</span>
                  <span>·</span>
                  <span>{ex.unit === 'seconds' ? 'Temps (s)' : 'Reps'}</span>
                </div>
              </div>
              <Plus className="h-4 w-4 shrink-0 text-cyan-500" />
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary p-2.5"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            {contextBadge && (
              <span className="mb-1 inline-block rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-bold text-cyan-600 dark:text-cyan-300">
                {contextBadge}
              </span>
            )}
            <h1 className="font-display text-xl font-bold sm:text-2xl">
              {titleOverride ?? (initialWorkout ? 'Modifier la séance' : 'Nouvelle séance')}
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {discipline === 'running'
                ? `${parsedRunDist > 0 ? `${parsedRunDist} km` : 'Distance libre'} · ${parsedRunDurSec > 0 ? formatDuration(parsedRunDurSec) : 'Durée libre'}`
                : `${items.length} exercice${items.length > 1 ? 's' : ''} · ${totalSets} série${totalSets > 1 ? 's' : ''} · ~${formatDuration(estimatedSec)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary px-4 py-2.5 text-sm"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary flex-1 px-5 py-2.5 text-sm sm:flex-none"
          >
            <Save className="h-4 w-4" />
            Enregistrer
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      <div
        className={`grid grid-cols-1 gap-6 ${
          discipline === 'street_workout' ? 'lg:grid-cols-[1fr_340px]' : ''
        }`}
      >
        <div className="space-y-5">
          {/* Workout Metadata */}
          <section className="surface-card p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                  Catégorie d&apos;entraînement
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscipline('street_workout');
                      setErrorMsg('');
                    }}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition ${
                      discipline === 'street_workout'
                        ? 'border-cyan-400 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                        : 'border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <Dumbbell className="h-4 w-4" />
                    Street Workout
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscipline('running');
                      if (accent === 'cyan') setAccent('emerald');
                      setErrorMsg('');
                    }}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition ${
                      discipline === 'running'
                        ? 'border-emerald-400 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <Footprints className="h-4 w-4" />
                    Running
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                  Nom de la séance
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder={
                    discipline === 'running'
                      ? 'Ex : Sortie Endurance 10 km, Fractionné 30/30...'
                      : 'Ex : Push Street, Full Body Parc, Pull Force...'
                  }
                  className="input-field font-display text-base font-bold"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                  Description (optionnel)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex : Focus dips lourds et gainage"
                  className="input-field"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                  Couleur repère
                </label>
                <div className="flex items-center gap-2.5 pt-1">
                  {ACCENTS.map((key) => {
                    const style = WORKOUT_ACCENTS[key];
                    const selected = accent === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAccent(key)}
                        aria-label={style.label}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${
                          selected
                            ? 'scale-110 border-slate-900 dark:border-white'
                            : 'border-transparent opacity-65 hover:opacity-100'
                        }`}
                      >
                        <span className={`h-5 w-5 rounded-full ${style.dot}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {discipline === 'running' ? (
            <section className="surface-card space-y-4 border-emerald-500/30 p-5 sm:p-6">
              <div className="flex items-center gap-2 font-display text-base font-bold text-emerald-600 dark:text-emerald-400">
                <Footprints className="h-4 w-4" />
                Paramètres de la course à pied
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                    Type de sortie
                  </label>
                  <select
                    value={runType}
                    onChange={(e) => setRunType(e.target.value as RunningCategory)}
                    className="input-field"
                  >
                    {RUNNING_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_META[cat].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                    Distance prévue (km)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={targetDistanceKm}
                    onChange={(e) => setTargetDistanceKm(e.target.value)}
                    placeholder="Ex : 8.5"
                    className="input-field font-display text-base font-bold tabular-nums"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                    Durée prévue (minutes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={targetDurationMin}
                    onChange={(e) => setTargetDurationMin(e.target.value)}
                    placeholder="Ex : 45"
                    className="input-field font-display text-base font-bold tabular-nums"
                  />
                </div>
              </div>

              {parsedRunDist > 0 && parsedRunDurSec > 0 && (
                <div className="flex flex-wrap items-center gap-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <span>
                    Allure cible : {formatPace(parsedRunDurSec / parsedRunDist)}
                  </span>
                  <span>·</span>
                  <span>
                    Vitesse cible :{' '}
                    {formatSpeed(parsedRunDist / (parsedRunDurSec / 3600))}
                  </span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                  Consignes / Détails (optionnel)
                </label>
                <input
                  type="text"
                  value={runNotes}
                  onChange={(e) => setRunNotes(e.target.value)}
                  placeholder="Ex : 15 min échauffement + 10×30/30 + 10 min retour au calme..."
                  className="input-field"
                />
              </div>
            </section>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setPickerOpenMobile(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-cyan-500/45 bg-cyan-500/10 py-3.5 text-sm font-bold text-cyan-700 lg:hidden dark:text-cyan-300"
              >
                <Plus className="h-5 w-5" />
                Ajouter un exercice à la séance
              </button>

              {items.length === 0 ? (
                <div className="surface-card border-dashed p-10 text-center">
                  <Dumbbell className="mx-auto h-9 w-9 text-slate-400" />
                  <p className="mt-2.5 text-sm font-medium text-slate-600 dark:text-slate-400">
                    Aucun exercice pour l&apos;instant. Sélectionne-en dans la liste{' '}
                    <span className="hidden lg:inline">à droite</span>
                    <span className="lg:hidden">ci-dessus</span>.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, idx) => {
                    const ex = exerciseMap.get(item.exerciseId);
                    const unit = ex?.unit ?? 'reps';
                    const unitLabel = unit === 'seconds' ? 'sec' : 'reps';
                    const isLastExercise = idx === items.length - 1;

                    return (
                      <div key={item.id} className="surface-card p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-emerald-400/20 text-sm font-bold text-cyan-600 dark:text-cyan-300">
                              {idx + 1}
                            </span>
                            <div>
                              <h3 className="font-display text-base font-bold">
                                {ex?.name ?? 'Exercice inconnu'}
                              </h3>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                Objectif en{' '}
                                {unit === 'seconds'
                                  ? 'secondes de maintien'
                                  : 'répétitions'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveItem(idx, -1)}
                              title="Monter"
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/[0.06]"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              disabled={isLastExercise}
                              onClick={() => moveItem(idx, 1)}
                              title="Descendre"
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/[0.06]"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              title="Retirer"
                              className="rounded-lg p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-white/[0.06]">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Séries
                            </span>
                            <div className="surface-inset inline-flex items-center gap-2 p-1">
                              <button
                                type="button"
                                onClick={() => changeSetCount(item.id, -1)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-white/10"
                                aria-label="Retirer une série"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="font-display w-7 text-center text-sm font-bold tabular-nums">
                                {item.sets.length}
                              </span>
                              <button
                                type="button"
                                onClick={() => changeSetCount(item.id, 1)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-white/10"
                                aria-label="Ajouter une série"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {item.sets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => applyFirstSetToAll(item.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-cyan-600 hover:bg-cyan-500/10 dark:text-cyan-400"
                            >
                              <CopyCheck className="h-3.5 w-3.5" />
                              Copier Série 1 sur toutes
                            </button>
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {item.sets.map((set, setIdx) => (
                            <div
                              key={set.id}
                              className="surface-inset flex items-center justify-between gap-2 px-3 py-2"
                            >
                              <span className="text-xs font-bold text-slate-500">
                                Série {setIdx + 1}
                              </span>

                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateSetTarget(
                                        item.id,
                                        setIdx,
                                        set.target - (unit === 'seconds' ? 5 : 1)
                                      )
                                    }
                                    className="btn-secondary h-7 w-7 rounded-lg text-xs"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={1}
                                    max={999}
                                    value={set.target}
                                    onChange={(e) =>
                                      updateSetTarget(
                                        item.id,
                                        setIdx,
                                        Number(e.target.value)
                                      )
                                    }
                                    className="w-12 rounded-lg border border-slate-200 bg-white py-1 text-center text-sm font-bold tabular-nums outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-[#0d121c]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateSetTarget(
                                        item.id,
                                        setIdx,
                                        set.target + (unit === 'seconds' ? 5 : 1)
                                      )
                                    }
                                    className="btn-secondary h-7 w-7 rounded-lg text-xs"
                                  >
                                    +
                                  </button>
                                  <span className="w-8 text-xs text-slate-500">
                                    {unitLabel}
                                  </span>
                                </div>

                                <input
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  placeholder="+kg"
                                  value={set.weightKg ?? ''}
                                  onChange={(e) =>
                                    updateSetWeight(item.id, setIdx, e.target.value)
                                  }
                                  title="Lestage additionnel en kg (optionnel)"
                                  className="w-14 rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-center text-xs outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-[#0d121c]"
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 dark:border-white/[0.06]">
                          <div className="surface-inset p-3.5">
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400">
                                <Clock className="h-3.5 w-3.5" />
                                Repos entre séries
                              </span>
                              <span className="font-display text-sm font-bold tabular-nums">
                                {formatDuration(item.restBetweenSetsSec)}
                              </span>
                            </div>
                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  updateItem(item.id, (cur) => ({
                                    ...cur,
                                    restBetweenSetsSec: Math.max(
                                      0,
                                      cur.restBetweenSetsSec - 15
                                    ),
                                  }))
                                }
                                className="btn-secondary rounded-lg px-2 py-1 text-xs"
                              >
                                -15s
                              </button>
                              {REST_SET_PRESETS.map((sec) => (
                                <button
                                  key={sec}
                                  type="button"
                                  onClick={() =>
                                    updateItem(item.id, (cur) => ({
                                      ...cur,
                                      restBetweenSetsSec: sec,
                                    }))
                                  }
                                  className={`rounded-lg px-2 py-1 text-xs font-bold transition ${
                                    item.restBetweenSetsSec === sec
                                      ? 'bg-cyan-400 text-slate-950'
                                      : 'bg-slate-200/70 text-slate-700 dark:bg-white/[0.07] dark:text-slate-300'
                                  }`}
                                >
                                  {formatDuration(sec)}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() =>
                                  updateItem(item.id, (cur) => ({
                                    ...cur,
                                    restBetweenSetsSec: Math.min(
                                      600,
                                      cur.restBetweenSetsSec + 15
                                    ),
                                  }))
                                }
                                className="btn-secondary rounded-lg px-2 py-1 text-xs"
                              >
                                +15s
                              </button>
                            </div>
                          </div>

                          <div
                            className={`surface-inset p-3.5 ${
                              isLastExercise ? 'opacity-55' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                                <Clock className="h-3.5 w-3.5" />
                                {isLastExercise
                                  ? 'Repos fin de séance'
                                  : 'Repos avant exo suivant'}
                              </span>
                              <span className="font-display text-sm font-bold tabular-nums">
                                {formatDuration(item.restAfterExerciseSec)}
                              </span>
                            </div>
                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  updateItem(item.id, (cur) => ({
                                    ...cur,
                                    restAfterExerciseSec: Math.max(
                                      0,
                                      cur.restAfterExerciseSec - 15
                                    ),
                                  }))
                                }
                                className="btn-secondary rounded-lg px-2 py-1 text-xs"
                              >
                                -15s
                              </button>
                              {REST_EXO_PRESETS.map((sec) => (
                                <button
                                  key={sec}
                                  type="button"
                                  onClick={() =>
                                    updateItem(item.id, (cur) => ({
                                      ...cur,
                                      restAfterExerciseSec: sec,
                                    }))
                                  }
                                  className={`rounded-lg px-2 py-1 text-xs font-bold transition ${
                                    item.restAfterExerciseSec === sec
                                      ? 'bg-amber-400 text-slate-950'
                                      : 'bg-slate-200/70 text-slate-700 dark:bg-white/[0.07] dark:text-slate-300'
                                  }`}
                                >
                                  {formatDuration(sec)}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() =>
                                  updateItem(item.id, (cur) => ({
                                    ...cur,
                                    restAfterExerciseSec: Math.min(
                                      900,
                                      cur.restAfterExerciseSec + 15
                                    ),
                                  }))
                                }
                                className="btn-secondary rounded-lg px-2 py-1 text-xs"
                              >
                                +15s
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <input
                            type="text"
                            value={item.notes ?? ''}
                            onChange={(e) =>
                              updateItem(item.id, (cur) => ({
                                ...cur,
                                notes: e.target.value || undefined,
                              }))
                            }
                            placeholder="Note pour cet exo (ex: tempo lent, prise large, élastique)..."
                            className="input-field py-2 text-xs"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {discipline === 'street_workout' && (
          <aside className="hidden lg:block">
            <div className="surface-card sticky top-6 p-5">{pickerPanel}</div>
          </aside>
        )}
      </div>

      {discipline === 'street_workout' && pickerOpenMobile && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/75 backdrop-blur-sm lg:hidden">
          <div className="surface-card max-h-[85vh] w-full overflow-y-auto rounded-t-3xl p-5 pb-safe">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-base font-bold">
                Choisir un exercice
              </span>
              <button
                type="button"
                onClick={() => setPickerOpenMobile(false)}
                className="btn-secondary p-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {pickerPanel}
            <button
              type="button"
              onClick={() => setPickerOpenMobile(false)}
              className="btn-primary mt-4 w-full py-3 text-sm"
            >
              <Check className="h-4 w-4" />
              Terminer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
