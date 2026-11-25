import { useMemo, useState } from 'react';
import { Dumbbell, Footprints, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import {
  Discipline,
  Exercise,
  ExerciseCategory,
  ExerciseUnit,
} from '../types/workout';
import {
  CATEGORY_META,
  DISCIPLINE_META,
  generateId,
  RUNNING_CATEGORIES,
  STREET_CATEGORIES,
} from '../utils/format';

interface ExerciseLibraryProps {
  exercises: Exercise[];
  onSaveExercise: (exercise: Exercise) => void;
  onDeleteExercise: (exerciseId: string) => void;
}

export function ExerciseLibrary({
  exercises,
  onSaveExercise,
  onDeleteExercise,
}: ExerciseLibraryProps) {
  const [disciplineFilter, setDisciplineFilter] = useState<Discipline | 'all'>('all');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | 'all'>('all');
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [discipline, setDiscipline] = useState<Discipline>('street_workout');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<ExerciseUnit>('reps');
  const [category, setCategory] = useState<ExerciseCategory>('push');
  const [notes, setNotes] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const availableFormCategories =
    discipline === 'running' ? RUNNING_CATEGORIES : STREET_CATEGORIES;

  const availableFilterCategories: ExerciseCategory[] =
    disciplineFilter === 'running'
      ? RUNNING_CATEGORIES
      : disciplineFilter === 'street_workout'
        ? STREET_CATEGORIES
        : [...STREET_CATEGORIES, ...RUNNING_CATEGORIES];

  const openNewForm = () => {
    const initialDisc = disciplineFilter === 'running' ? 'running' : 'street_workout';
    setEditing(null);
    setDiscipline(initialDisc);
    setName('');
    setUnit(initialDisc === 'running' ? 'seconds' : 'reps');
    setCategory(initialDisc === 'running' ? 'endurance' : 'push');
    setNotes('');
    setIsFormOpen(true);
  };

  const openEditForm = (ex: Exercise) => {
    setEditing(ex);
    setDiscipline(ex.discipline);
    setName(ex.name);
    setUnit(ex.unit);
    setCategory(ex.category);
    setNotes(ex.notes ?? '');
    setIsFormOpen(true);
  };

  const handleDisciplineChange = (next: Discipline) => {
    setDiscipline(next);
    if (next === 'running') {
      setCategory('endurance');
      setUnit('seconds');
    } else {
      setCategory('push');
      setUnit('reps');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSaveExercise({
      id: editing ? editing.id : generateId('ex'),
      name: trimmed,
      discipline,
      unit,
      category,
      notes: notes.trim() || undefined,
      isCustom: editing ? editing.isCustom : true,
    });
    setIsFormOpen(false);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (disciplineFilter !== 'all' && ex.discipline !== disciplineFilter) return false;
      if (categoryFilter !== 'all' && ex.category !== categoryFilter) return false;
      if (
        q &&
        !ex.name.toLowerCase().includes(q) &&
        !(ex.notes ?? '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [exercises, disciplineFilter, query, categoryFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Bibliothèque d&apos;exercices
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Exercices organisés en 2 disciplines : Street Workout et Running.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewForm}
          className="btn-primary px-4 py-3 text-sm"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Ajouter un exercice
        </button>
      </div>

      {/* Discipline filter */}
      <div className="inline-flex rounded-2xl border border-slate-200/90 bg-white p-1 dark:border-white/[0.08] dark:bg-[#0d121c]">
        {(['all', 'street_workout', 'running'] as const).map((disc) => (
          <button
            key={disc}
            type="button"
            onClick={() => {
              setDisciplineFilter(disc);
              setCategoryFilter('all');
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              disciplineFilter === disc
                ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {disc === 'street_workout' && <Dumbbell className="h-3.5 w-3.5" />}
            {disc === 'running' && <Footprints className="h-3.5 w-3.5" />}
            {disc === 'all'
              ? `Tous (${exercises.length})`
              : DISCIPLINE_META[disc].label}
          </button>
        ))}
      </div>

      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="surface-card border-cyan-500/35 p-5 sm:p-6 animate-view-in"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">
              {editing ? 'Modifier l’exercice' : 'Nouvel exercice'}
            </h2>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="btn-secondary p-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Catégorie principale
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDisciplineChange('street_workout')}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
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
                  onClick={() => handleDisciplineChange('running')}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
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

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Nom
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  discipline === 'running'
                    ? 'Ex : Sortie longue, VMA 400m...'
                    : 'Ex : Tractions lestées, Front Lever...'
                }
                className="input-field font-semibold"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Sous-catégorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
                className="input-field"
              >
                {availableFormCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_META[cat].label}
                  </option>
                ))}
              </select>
            </div>

            {discipline === 'street_workout' && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                  Unité par défaut
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUnit('reps')}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                      unit === 'reps'
                        ? 'border-cyan-400 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                        : 'border-slate-200 dark:border-white/10'
                    }`}
                  >
                    Répétitions
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnit('seconds')}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                      unit === 'seconds'
                        ? 'border-cyan-400 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                        : 'border-slate-200 dark:border-white/10'
                    }`}
                  >
                    Secondes (statique)
                  </button>
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Consignes techniques (optionnel)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex : Allure zone 2, épaules abaissées..."
                className="input-field"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="btn-secondary px-4 py-2 text-sm"
            >
              Annuler
            </button>
            <button type="submit" className="btn-primary px-5 py-2 text-sm">
              Enregistrer
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer les exercices..."
            className="input-field pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              categoryFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-300'
            }`}
          >
            Toutes
          </button>
          {availableFilterCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                categoryFilter === cat
                  ? 'bg-cyan-400 text-slate-950'
                  : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-300'
              }`}
            >
              {CATEGORY_META[cat].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((ex) => {
          const catMeta = CATEGORY_META[ex.category];
          const discMeta = DISCIPLINE_META[ex.discipline];
          const isDeleting = confirmDeleteId === ex.id;

          return (
            <div
              key={ex.id}
              className="surface-card surface-card-hover flex flex-col justify-between p-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-bold text-slate-900 dark:text-slate-100">
                    {ex.name}
                  </h3>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${discMeta.badgeClass}`}
                    >
                      {discMeta.shortLabel}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${catMeta.badgeClass}`}
                    >
                      {catMeta.label}
                    </span>
                  </div>
                </div>
                <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {ex.discipline === 'running'
                    ? 'Course à pied (durée & distance)'
                    : `Mesure : ${ex.unit === 'seconds' ? 'Temps de maintien (sec)' : 'Répétitions'}`}
                </p>
                {ex.notes && (
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {ex.notes}
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-white/[0.06]">
                {isDeleting ? (
                  <div className="flex w-full items-center justify-between text-xs">
                    <span className="font-semibold text-rose-500">
                      Retirer aussi des séances ?
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg px-2.5 py-1 font-semibold hover:bg-slate-100 dark:hover:bg-white/10"
                      >
                        Non
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteExercise(ex.id);
                          setConfirmDeleteId(null);
                        }}
                        className="rounded-lg bg-rose-600 px-2.5 py-1 font-bold text-white"
                      >
                        Oui
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => openEditForm(ex)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.06]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(ex.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-rose-500/10 hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
