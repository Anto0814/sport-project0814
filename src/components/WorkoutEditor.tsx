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
  const [runNotes, setRunNotes] = useState(
    initialWorkout?.runningConfig?.notes ?? ''
  );

  // Exercise picker state (sidebar on desktop, modal on mobile)
  const [pickerOpenMobile, setPickerOpenMobile] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickExName, setQuickExName] = useState('');
  const [quickExUnit, setQuickExUnit] = useState<ExerciseUnit>('reps');
  const [quickExCat, setQuickExCat] = useState<ExerciseCategory>('push');
  const [errorMsg, setErrorMsg] = useState('');

  const parsedRunDist = Math.max(0, Number(targetDistanceKm) || 0);
  const parsedRunDurSec = Math.max(0, Math.round((Number(targetDurationMin) || 0) * 60));

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

  const updateItem = (id: string, updater: (item: WorkoutExercise) => WorkoutExercise) => {
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
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Ajouter un exercice
        </h3>
        <button
          type="button"
          onClick={() => setShowQuickCreate((v) => !v)}
          className="text-xs font-semibold text-cyan-600 hover:underline dark:text-cyan-400"
        >
          {showQuickCreate ? 'Fermer' : '+ Créer un exo'}
        </button>
      </div>

      {showQuickCreate && (
        <form
          onSubmit={handleQuickCreateExercise}
          className="space-y-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3"
        >
          <input
            type="text"
            required
            value={quickExName}
            onChange={(e) => setQuickExName(e.target.value)}
            placeholder="Nom de l'exercice..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={quickExUnit}
              onChange={(e) => setQuickExUnit(e.target.value as ExerciseUnit)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="reps">Répétitions</option>
              <option value="seconds">Secondes</option>
            </select>
            <select
              value={quickExCat}
              onChange={(e) => setQuickExCat(e.target.value as ExerciseCategory)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
            >
              {STREET_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_META[cat].label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-cyan-500 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Créer et ajouter à la séance
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
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm outline-none focus:border-cyan-500 dark:border-slate-800 dark:bg-slate-950"
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
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2.5 text-left transition hover:border-cyan-500/50 hover:bg-cyan-500/10 dark:border-slate-800 dark:bg-slate-950/60"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{ex.name}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
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
            className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            {contextBadge && (
              <span className="mb-1 inline-block rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-600 dark:text-cyan-300">
                {contextBadge}
              </span>
            )}
            <h1 className="text-xl font-bold sm:text-2xl">
              {titleOverride ?? (initialWorkout ? 'Modifier la séance' : 'Nouvelle séance')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
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
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 sm:flex-none"
          >
            <Save className="h-4 w-4" />
            Enregistrer
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Adaptive 2-column layout on desktop for Street Workout, focused card for Running */}
      <div
        className={`grid grid-cols-1 gap-6 ${
          discipline === 'street_workout' ? 'lg:grid-cols-[1fr_340px]' : ''
        }`}
      >
        <div className="space-y-5">
          {/* Workout info card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Catégorie d&apos;entraînement
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscipline('street_workout');
                      setErrorMsg('');
                    }}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition ${
                      discipline === 'street_workout'
                        ? 'border-cyan-500 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                        : 'border-slate-200 dark:border-slate-700'
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
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition ${
                      discipline === 'running'
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Footprints className="h-4 w-4" />
                    Running
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
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
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-base font-medium outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Description (optionnel)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex : Focus dips lourds et gainage"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
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
                            : 'border-transparent opacity-70 hover:opacity-100'
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
            <section className="space-y-4 rounded-2xl border border-emerald-500/30 bg-white p-5 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                <Footprints className="h-4 w-4" />
                Paramètres de la course à pied
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    Type de sortie
                  </label>
                  <select
                    value={runType}
                    onChange={(e) => setRunType(e.target.value as RunningCategory)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
                  >
                    {RUNNING_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_META[cat].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    Distance prévue (km)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={targetDistanceKm}
                    onChange={(e) => setTargetDistanceKm(e.target.value)}
                    placeholder="Ex : 8.5"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-base font-bold tabular-nums outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    Durée prévue (minutes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={targetDurationMin}
                    onChange={(e) => setTargetDurationMin(e.target.value)}
                    placeholder="Ex : 45"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-base font-bold tabular-nums outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
              </div>

              {parsedRunDist > 0 && parsedRunDurSec > 0 && (
                <div className="flex flex-wrap items-center gap-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
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
                <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Consignes / Détails (optionnel)
                </label>
                <input
                  type="text"
                  value={runNotes}
                  onChange={(e) => setRunNotes(e.target.value)}
                  placeholder="Ex : 15 min échauffement + 10×30/30 + 10 min retour au calme..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
            </section>
          ) : (
            <>
              {/* Mobile add exercise button */}
              <button
                type="button"
                onClick={() => setPickerOpenMobile(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-cyan-500/50 bg-cyan-500/10 py-3.5 text-sm font-semibold text-cyan-700 lg:hidden dark:text-cyan-300"
              >
                <Plus className="h-5 w-5" />
                Ajouter un exercice à la séance
              </button>

              {/* Ordered exercises */}
              {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
                  <Dumbbell className="mx-auto h-9 w-9 text-slate-400" />
                  <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
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
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900"
                  >
                    {/* Exercise header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {idx + 1}
                        </span>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-slate-100">
                            {ex?.name ?? 'Exercice inconnu'}
                          </h3>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Objectif en {unit === 'seconds' ? 'secondes de maintien' : 'répétitions'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveItem(idx, -1)}
                          title="Monter"
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isLastExercise}
                          onClick={() => moveItem(idx, 1)}
                          title="Descendre"
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
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

                    {/* Sets count + copy helper */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Séries
                        </span>
                        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
                          <button
                            type="button"
                            onClick={() => changeSetCount(item.id, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                            aria-label="Retirer une série"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-7 text-center text-sm font-bold tabular-nums">
                            {item.sets.length}
                          </span>
                          <button
                            type="button"
                            onClick={() => changeSetCount(item.id, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
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
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-cyan-600 hover:bg-cyan-500/10 dark:text-cyan-400"
                        >
                          <CopyCheck className="h-3.5 w-3.5" />
                          Copier Série 1 sur toutes
                        </button>
                      )}
                    </div>

                    {/* Per-set targets */}
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {item.sets.map((set, setIdx) => (
                        <div
                          key={set.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/70"
                        >
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
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
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={999}
                                value={set.target}
                                onChange={(e) =>
                                  updateSetTarget(item.id, setIdx, Number(e.target.value))
                                }
                                className="w-12 rounded-lg border border-slate-200 bg-white py-1 text-center text-sm font-bold tabular-nums outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900"
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
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900"
                              >
                                +
                              </button>
                              <span className="w-8 text-xs text-slate-500">{unitLabel}</span>
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
                              className="w-14 rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-center text-xs outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Rest times: between sets AND between exercises */}
                    <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 dark:border-slate-800">
                      {/* Rest between sets */}
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/70">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                            <Clock className="h-3.5 w-3.5" />
                            Repos entre séries
                          </span>
                          <span className="text-sm font-bold tabular-nums">
                            {formatDuration(item.restBetweenSetsSec)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              updateItem(item.id, (cur) => ({
                                ...cur,
                                restBetweenSetsSec: Math.max(0, cur.restBetweenSetsSec - 15),
                              }))
                            }
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-200 dark:border-slate-800 dark:hover:bg-slate-800"
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
                              className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
                                item.restBetweenSetsSec === sec
                                  ? 'bg-cyan-500 text-slate-950'
                                  : 'bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
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
                                restBetweenSetsSec: Math.min(600, cur.restBetweenSetsSec + 15),
                              }))
                            }
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-200 dark:border-slate-800 dark:hover:bg-slate-800"
                          >
                            +15s
                          </button>
                        </div>
                      </div>

                      {/* Rest between exercises */}
                      <div
                        className={`rounded-xl p-3 ${
                          isLastExercise
                            ? 'bg-slate-50/50 opacity-60 dark:bg-slate-950/40'
                            : 'bg-slate-50 dark:bg-slate-950/70'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                            <Clock className="h-3.5 w-3.5" />
                            {isLastExercise
                              ? 'Repos fin de séance (optionnel)'
                              : 'Repos avant exo suivant'}
                          </span>
                          <span className="text-sm font-bold tabular-nums">
                            {formatDuration(item.restAfterExerciseSec)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              updateItem(item.id, (cur) => ({
                                ...cur,
                                restAfterExerciseSec: Math.max(0, cur.restAfterExerciseSec - 15),
                              }))
                            }
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-200 dark:border-slate-800 dark:hover:bg-slate-800"
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
                              className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
                                item.restAfterExerciseSec === sec
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
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
                                restAfterExerciseSec: Math.min(900, cur.restAfterExerciseSec + 15),
                              }))
                            }
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-200 dark:border-slate-800 dark:hover:bg-slate-800"
                          >
                            +15s
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Optional per-exercise note */}
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
                        className="w-full rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2 text-xs outline-none focus:border-cyan-500 dark:border-slate-800 dark:bg-slate-950/60"
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

        {/* Desktop sticky exercise picker (Street Workout only) */}
        {discipline === 'street_workout' && (
          <aside className="hidden lg:block">
            <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              {pickerPanel}
            </div>
          </aside>
        )}
      </div>

      {/* Mobile slide-up modal exercise picker */}
      {discipline === 'street_workout' && pickerOpenMobile && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/70 backdrop-blur-xs lg:hidden">
          <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-white p-5 pb-safe dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-base font-bold">Choisir un exercice</span>
              <button
                type="button"
                onClick={() => setPickerOpenMobile(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {pickerPanel}
            <button
              type="button"
              onClick={() => setPickerOpenMobile(false)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-200 py-3 text-sm font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-100"
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
