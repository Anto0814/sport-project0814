import { useState } from 'react';
import {
  ArrowLeft,
  CalendarRange,
  Coffee,
  Minus,
  Pencil,
  Plus,
  Repeat,
  Save,
  Trash2,
} from 'lucide-react';
import {
  Exercise,
  ProgramSlot,
  ProgramType,
  WorkoutProgram,
  WorkoutTemplate,
} from '../types/workout';
import {
  cloneWorkoutForSlot,
  createEmptyWorkout,
  getTodayStr,
  WEEKDAY_NAMES_FULL,
} from '../utils/calendar';
import {
  estimateWorkoutDurationSec,
  formatDuration,
  generateId,
  WORKOUT_ACCENTS,
} from '../utils/format';
import { ToggleSwitch } from './ToggleSwitch';
import { WorkoutEditor } from './WorkoutEditor';

interface ProgramEditorProps {
  initialProgram: WorkoutProgram | null;
  workouts: WorkoutTemplate[];
  exercises: Exercise[];
  exerciseMap: Map<string, Exercise>;
  onSaveProgram: (program: WorkoutProgram) => void;
  onSaveExercise: (exercise: Exercise) => void;
  onCancel: () => void;
}

function makeDefaultCycleSlots(count: number, firstWorkout?: WorkoutTemplate): ProgramSlot[] {
  return Array.from({ length: count }, (_, idx) => ({
    id: generateId('slot'),
    label: `Jour ${idx + 1}`,
    workout: idx === 0 && firstWorkout ? cloneWorkoutForSlot(firstWorkout) : null,
  }));
}

function makeDefaultWeeklySlots(workouts: WorkoutTemplate[]): ProgramSlot[] {
  return WEEKDAY_NAMES_FULL.map((day, idx) => {
    const sample =
      idx === 0 && workouts[0]
        ? cloneWorkoutForSlot(workouts[0])
        : idx === 2 && workouts[1]
          ? cloneWorkoutForSlot(workouts[1])
          : idx === 4 && workouts[0]
            ? cloneWorkoutForSlot(workouts[0])
            : null;
    return {
      id: generateId('slot'),
      label: day,
      workout: sample,
    };
  });
}

export function ProgramEditor({
  initialProgram,
  workouts,
  exercises,
  exerciseMap,
  onSaveProgram,
  onSaveExercise,
  onCancel,
}: ProgramEditorProps) {
  const [name, setName] = useState(initialProgram?.name ?? '');
  const [type, setType] = useState<ProgramType>(initialProgram?.type ?? 'cycle');
  const [isActive, setIsActive] = useState(initialProgram?.isActive ?? true);
  const [startDate, setStartDate] = useState(initialProgram?.startDate ?? getTodayStr());
  const [endDate, setEndDate] = useState(initialProgram?.endDate ?? '');
  const [slots, setSlots] = useState<ProgramSlot[]>(() => {
    if (initialProgram) return initialProgram.slots;
    return makeDefaultCycleSlots(2, workouts[0]);
  });

  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleTypeChange = (nextType: ProgramType) => {
    if (nextType === type) return;
    setType(nextType);
    if (nextType === 'weekly') {
      setSlots(makeDefaultWeeklySlots(workouts));
    } else {
      setSlots(makeDefaultCycleSlots(2, workouts[0]));
    }
  };

  const changeCycleLength = (delta: number) => {
    if (type !== 'cycle') return;
    const nextLen = Math.max(2, Math.min(14, slots.length + delta));
    if (nextLen === slots.length) return;
    if (nextLen > slots.length) {
      const added: ProgramSlot[] = Array.from(
        { length: nextLen - slots.length },
        (_, idx) => ({
          id: generateId('slot'),
          label: `Jour ${slots.length + idx + 1}`,
          workout: null,
        })
      );
      setSlots([...slots, ...added]);
    } else {
      setSlots(slots.slice(0, nextLen));
    }
  };

  const applyCyclePreset = (preset: '1on1off' | '2on1off' | 'ppl_rest') => {
    setType('cycle');
    const w0 = workouts[0]
      ? cloneWorkoutForSlot(workouts[0])
      : createEmptyWorkout('Séance A');
    const w1 = workouts[1] ? cloneWorkoutForSlot(workouts[1]) : cloneWorkoutForSlot(w0);
    if (preset === '1on1off') {
      setSlots([
        { id: generateId('slot'), label: 'Jour 1 · Entraînement', workout: w0 },
        { id: generateId('slot'), label: 'Jour 2 · Repos', workout: null },
      ]);
      if (!name.trim()) setName('Cycle 1 jour sur 2');
    } else if (preset === '2on1off') {
      setSlots([
        { id: generateId('slot'), label: 'Jour 1', workout: w0 },
        { id: generateId('slot'), label: 'Jour 2', workout: w1 },
        { id: generateId('slot'), label: 'Jour 3 · Repos', workout: null },
      ]);
      if (!name.trim()) setName('Cycle 2 jours ON / 1 jour OFF');
    } else {
      setSlots([
        { id: generateId('slot'), label: 'Jour 1', workout: w0 },
        { id: generateId('slot'), label: 'Jour 2 · Repos', workout: null },
        { id: generateId('slot'), label: 'Jour 3', workout: w1 },
        { id: generateId('slot'), label: 'Jour 4 · Repos', workout: null },
      ]);
      if (!name.trim()) setName('Alternance A / Repos / B / Repos');
    }
  };

  const assignTemplateToSlot = (slotIdx: number, templateId: string) => {
    if (templateId === '__rest__') {
      setSlots((prev) =>
        prev.map((s, idx) => (idx === slotIdx ? { ...s, workout: null } : s))
      );
      return;
    }
    if (templateId === '__custom__') {
      const label =
        type === 'weekly' ? WEEKDAY_NAMES_FULL[slotIdx] : `Jour ${slotIdx + 1}`;
      const fresh = createEmptyWorkout(`Séance ${label}`);
      setSlots((prev) =>
        prev.map((s, idx) => (idx === slotIdx ? { ...s, workout: fresh } : s))
      );
      setEditingSlotIndex(slotIdx);
      return;
    }
    const tpl = workouts.find((w) => w.id === templateId);
    if (!tpl) return;
    setSlots((prev) =>
      prev.map((s, idx) =>
        idx === slotIdx ? { ...s, workout: cloneWorkoutForSlot(tpl) } : s
      )
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      setErrorMsg('Donne un nom à ton programme avant d’enregistrer.');
      return;
    }
    if (!slots.some((s) => s.workout !== null)) {
      setErrorMsg('Assigne au moins une séance dans le programme.');
      return;
    }
    const now = new Date().toISOString();
    onSaveProgram({
      id: initialProgram?.id ?? generateId('prog'),
      name: name.trim(),
      type,
      isActive,
      startDate,
      endDate: endDate || undefined,
      slots,
      createdAt: initialProgram?.createdAt ?? now,
      updatedAt: now,
    });
  };

  if (editingSlotIndex !== null && slots[editingSlotIndex]) {
    const slot = slots[editingSlotIndex];
    const dayTitle =
      type === 'weekly'
        ? WEEKDAY_NAMES_FULL[editingSlotIndex]
        : slot.label || `Jour ${editingSlotIndex + 1}`;

    return (
      <WorkoutEditor
        initialWorkout={slot.workout}
        exercises={exercises}
        exerciseMap={exerciseMap}
        titleOverride={`Personnaliser : ${dayTitle}`}
        contextBadge={`Programme · ${name.trim() || 'Nouveau programme'}`}
        onSaveExercise={onSaveExercise}
        onSaveWorkout={(updatedWorkout) => {
          setSlots((prev) =>
            prev.map((s, idx) =>
              idx === editingSlotIndex ? { ...s, workout: updatedWorkout } : s
            )
          );
          setEditingSlotIndex(null);
        }}
        onCancel={() => setEditingSlotIndex(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel} className="btn-secondary p-2.5">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-xl font-bold sm:text-2xl">
              {initialProgram ? 'Modifier le programme' : 'Nouveau programme répétable'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cycle sur N jours (ex : 1 jour sur 2) ou semaine type du lundi au dimanche.
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
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      <section className="surface-card space-y-5 p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              Nom du programme
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrorMsg('');
              }}
              placeholder="Ex : Cycle 1j/2 Street & Run, Semaine Type..."
              className="input-field font-semibold"
            />
          </div>

          <div className="flex items-end">
            <div className="surface-inset flex w-full items-center justify-between px-4 py-2.5">
              <div>
                <div className="text-sm font-bold">Programme actif</div>
                <div className="text-[11px] text-slate-500">
                  Projette automatiquement tes séances sur le calendrier
                </div>
              </div>
              <ToggleSwitch
                checked={isActive}
                onChange={setIsActive}
                ariaLabel="Programme actif"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-500">
            Mode de répétition
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleTypeChange('cycle')}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                type === 'cycle'
                  ? 'border-cyan-400 bg-cyan-500/10 shadow-sm'
                  : 'border-slate-200 hover:bg-slate-50 dark:border-white/[0.08] dark:hover:bg-white/[0.03]'
              }`}
            >
              <Repeat className="mt-0.5 h-5 w-5 shrink-0 text-cyan-500" />
              <div>
                <div className="font-display font-bold">Cycle répétable (N jours)</div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Idéal pour un rythme 1 jour sur 2, 2 ON / 1 OFF, ou rotation libre.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('weekly')}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                type === 'weekly'
                  ? 'border-emerald-400 bg-emerald-500/10 shadow-sm'
                  : 'border-slate-200 hover:bg-slate-50 dark:border-white/[0.08] dark:hover:bg-white/[0.03]'
              }`}
            >
              <CalendarRange className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div>
                <div className="font-display font-bold">Semaine type (Lun → Dim)</div>
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Jours fixes chaque semaine (ex : Lundi, Mercredi, Vendredi).
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              Date de début
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              Date de fin (optionnel)
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field"
            />
          </div>

          {type === 'cycle' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Durée du cycle
              </label>
              <div className="surface-inset flex items-center justify-between px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => changeCycleLength(-1)}
                  className="rounded-lg p-1.5 hover:bg-slate-200 dark:hover:bg-white/10"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="font-display text-sm font-bold">{slots.length} jours</span>
                <button
                  type="button"
                  onClick={() => changeCycleLength(1)}
                  className="rounded-lg p-1.5 hover:bg-slate-200 dark:hover:bg-white/10"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {type === 'cycle' && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/[0.06]">
            <span className="text-xs font-semibold text-slate-500">Modèles rapides :</span>
            <button
              type="button"
              onClick={() => applyCyclePreset('1on1off')}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              1 jour sur 2
            </button>
            <button
              type="button"
              onClick={() => applyCyclePreset('2on1off')}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              2 jours ON / 1 OFF
            </button>
            <button
              type="button"
              onClick={() => applyCyclePreset('ppl_rest')}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              Alternance A / Repos / B / Repos
            </button>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">
            {type === 'weekly'
              ? 'Jours de la semaine type'
              : `Jours du cycle (${slots.length} jours en boucle)`}
          </h2>
          <span className="text-xs text-slate-500">
            Chaque séance est personnalisable indépendamment
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {slots.map((slot, idx) => {
            const title =
              type === 'weekly' ? WEEKDAY_NAMES_FULL[idx] : `Jour ${idx + 1}`;
            const workout = slot.workout;
            const accent = workout ? WORKOUT_ACCENTS[workout.accent ?? 'cyan'] : null;
            const estSec = workout
              ? estimateWorkoutDurationSec(workout, exerciseMap)
              : 0;

            return (
              <div
                key={slot.id}
                className={`relative overflow-hidden rounded-2xl border p-4 transition ${
                  workout
                    ? `surface-card ${accent?.border ?? ''}`
                    : 'border-dashed border-slate-300 bg-slate-100/50 dark:border-white/10 dark:bg-white/[0.015]'
                }`}
              >
                {workout && accent && (
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent.bar}`} />
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-slate-200/80 px-2.5 py-1 text-xs font-bold dark:bg-white/[0.08]">
                      {title}
                    </span>
                    {workout ? (
                      <span className="font-display inline-flex items-center gap-1.5 text-sm font-bold">
                        {workout.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <Coffee className="h-3.5 w-3.5" />
                        Jour de repos
                      </span>
                    )}
                  </div>

                  {workout && (
                    <button
                      type="button"
                      onClick={() => assignTemplateToSlot(idx, '__rest__')}
                      title="Passer ce jour en repos"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) assignTemplateToSlot(idx, e.target.value);
                    }}
                    className="input-field flex-1 py-2 text-xs font-semibold"
                  >
                    <option value="">
                      {workout ? 'Remplacer par un modèle...' : '+ Choisir une séance...'}
                    </option>
                    {workouts.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} (
                        {w.discipline === 'running'
                          ? `${w.runningConfig?.targetDistanceKm ?? '?'} km · Running`
                          : `${w.exercises.length} exos`}
                        )
                      </option>
                    ))}
                    <option value="__custom__">+ Créer une séance sur mesure</option>
                    {workout && <option value="__rest__">Mettre en repos</option>}
                  </select>

                  {workout && (
                    <button
                      type="button"
                      onClick={() => setEditingSlotIndex(idx)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-cyan-500/15 px-3.5 py-2 text-xs font-bold text-cyan-700 hover:bg-cyan-500/25 dark:text-cyan-300"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Personnaliser
                    </button>
                  )}
                </div>

                {workout && (
                  <div className="mt-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {workout.discipline === 'running' ? (
                      <>
                        Running ·{' '}
                        {workout.runningConfig?.targetDistanceKm
                          ? `${workout.runningConfig.targetDistanceKm} km · `
                          : ''}
                        ~{formatDuration(estSec)}
                      </>
                    ) : (
                      <>
                        {workout.exercises.length} exercice
                        {workout.exercises.length > 1 ? 's' : ''} ·{' '}
                        {workout.exercises.reduce((a, b) => a + b.sets.length, 0)} séries · ~
                        {formatDuration(estSec)}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
