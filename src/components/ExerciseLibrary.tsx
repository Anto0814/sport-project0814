import { useMemo, useState } from 'react';
import {
  Dumbbell,
  Footprints,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
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

type LibraryFilter = Discipline | 'all' | 'custom';

export function ExerciseLibrary({
  exercises,
  onSaveExercise,
  onDeleteExercise,
}: ExerciseLibraryProps) {
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>('all');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | 'all'>('all');
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [discipline, setDiscipline] = useState<Discipline>('street_workout');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<ExerciseUnit>('reps');
  const [category, setCategory] = useState<ExerciseCategory>('push');
  const [variantsText, setVariantsText] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const customCount = useMemo(
    () => exercises.filter((e) => e.isCustom).length,
    [exercises]
  );

  const availableFormCategories =
    discipline === 'running' ? RUNNING_CATEGORIES : STREET_CATEGORIES;

  const availableFilterCategories: ExerciseCategory[] =
    libraryFilter === 'running'
      ? RUNNING_CATEGORIES
      : libraryFilter === 'street_workout'
        ? STREET_CATEGORIES
        : [...STREET_CATEGORIES, ...RUNNING_CATEGORIES];

  const openNewForm = () => {
    const initialDisc = libraryFilter === 'running' ? 'running' : 'street_workout';
    setEditing(null);
    setDiscipline(initialDisc);
    setName('');
    setUnit(initialDisc === 'running' ? 'seconds' : 'reps');
    setCategory(initialDisc === 'running' ? 'endurance' : 'push');
    setVariantsText('');
    setNotes('');
    setIsFormOpen(true);
  };

  const openEditForm = (ex: Exercise) => {
    setEditing(ex);
    setDiscipline(ex.discipline);
    setName(ex.name);
    setUnit(ex.unit);
    setCategory(ex.category);
    setVariantsText((ex.variants ?? []).join(', '));
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
    const parsedVariants = variantsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onSaveExercise({
      id: editing ? editing.id : generateId('ex'),
      name: trimmed,
      discipline,
      unit,
      category,
      variants: parsedVariants.length > 0 ? parsedVariants : undefined,
      notes: notes.trim() || undefined,
      isCustom: editing ? editing.isCustom : true,
    });
    setIsFormOpen(false);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (libraryFilter === 'custom' && !ex.isCustom) return false;
      if (
        (libraryFilter === 'street_workout' || libraryFilter === 'running') &&
        ex.discipline !== libraryFilter
      ) {
        return false;
      }
      if (categoryFilter !== 'all' && ex.category !== categoryFilter) return false;
      if (q) {
        const matchesName = ex.name.toLowerCase().includes(q);
        const matchesNotes = (ex.notes ?? '').toLowerCase().includes(q);
        const matchesVariant = (ex.variants ?? []).some((v) =>
          v.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesNotes && !matchesVariant) return false;
      }
      return true;
    });
  }, [exercises, libraryFilter, query, categoryFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Bibliothèque d&apos;exercices
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Exercices de base avec variantes (Street Workout, Running) et tes créations personnelles.
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

      {/* Main category tabs including dedicated "Mes exercices" */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200/90 bg-white p-1.5 sm:inline-flex dark:border-white/[0.08] dark:bg-[#0d121c]">
        {(
          [
            { id: 'all', label: `Tous (${exercises.length})` },
            { id: 'street_workout', label: 'Street Workout' },
            { id: 'running', label: 'Running' },
            { id: 'custom', label: `Mes exercices (${customCount})` },
          ] as { id: LibraryFilter; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setLibraryFilter(tab.id);
              setCategoryFilter('all');
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              libraryFilter === tab.id
                ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab.id === 'street_workout' && <Dumbbell className="h-3.5 w-3.5" />}
            {tab.id === 'running' && <Footprints className="h-3.5 w-3.5" />}
            {tab.id === 'custom' && <Sparkles className="h-3.5 w-3.5" />}
            {tab.label}
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
              {editing ? 'Modifier l’exercice' : 'Nouvel exercice personnalisé'}
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
                Nom de base
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  discipline === 'running'
                    ? 'Ex : Sortie longue, VMA...'
                    : 'Ex : Human Flag, Tractions lestées...'
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
                Variantes proposées (séparées par des virgules — optionnel)
              </label>
              <input
                type="text"
                value={variantsText}
                onChange={(e) => setVariantsText(e.target.value)}
                placeholder="Ex : Prise large, Prise serrée, Avec élastique"
                className="input-field"
              />
            </div>

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

      {/* Search + sub-categories */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="search-field max-w-md flex-1">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer par nom ou variante..."
            className="search-field-input"
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

      {/* Exercise cards */}
      {filtered.length === 0 ? (
        <div className="surface-card border-dashed p-10 text-center">
          <Sparkles className="mx-auto h-9 w-9 text-slate-400" />
          <h3 className="font-display mt-3 text-lg font-bold">
            {libraryFilter === 'custom'
              ? 'Aucun exercice personnalisé pour le moment'
              : 'Aucun exercice trouvé'}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {libraryFilter === 'custom'
              ? 'Clique sur « Ajouter un exercice » pour créer tes propres exercices.'
              : 'Essaie un autre mot-clé ou filtre.'}
          </p>
        </div>
      ) : (
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
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-display font-bold text-slate-900 dark:text-slate-100">
                        {ex.name}
                      </h3>
                      {ex.isCustom && (
                        <span
                          title="Créé par toi"
                          className="inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-300"
                        >
                          Perso
                        </span>
                      )}
                    </div>
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

                  {ex.variants && ex.variants.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {ex.variants.map((v) => (
                        <span
                          key={v}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  )}

                  {ex.notes && (
                    <p className="mt-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
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
      )}
    </div>
  );
}
