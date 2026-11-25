import { useState } from 'react';
import {
  CalendarDays,
  Dumbbell,
  Flame,
  History,
  ListChecks,
  Moon,
  Plus,
  Settings,
  Sun,
} from 'lucide-react';
import { CalendarView } from './components/CalendarView';
import { ExerciseLibrary } from './components/ExerciseLibrary';
import { RunImportModal } from './components/RunImportModal';
import { RunningPlayer } from './components/RunningPlayer';
import { SettingsView } from './components/SettingsView';
import { WorkoutEditor } from './components/WorkoutEditor';
import { WorkoutHistory } from './components/WorkoutHistory';
import { WorkoutList } from './components/WorkoutList';
import { WorkoutPlayer } from './components/WorkoutPlayer';
import { useAppStore } from './hooks/useAppStore';
import { AppView, WorkoutTemplate } from './types/workout';

const NAV_ITEMS: {
  id: Exclude<AppView, 'editor'>;
  label: string;
  shortLabel: string;
  icon: typeof Dumbbell;
}[] = [
  { id: 'workouts', label: 'Mes séances', shortLabel: 'Séances', icon: Flame },
  { id: 'calendar', label: 'Calendrier', shortLabel: 'Agenda', icon: CalendarDays },
  { id: 'exercises', label: 'Exercices', shortLabel: 'Exos', icon: Dumbbell },
  { id: 'history', label: 'Historique', shortLabel: 'Historique', icon: History },
  { id: 'settings', label: 'Réglages', shortLabel: 'Réglages', icon: Settings },
];

export function App() {
  const {
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
  } = useAppStore();

  const [view, setView] = useState<AppView>('workouts');
  const [editingWorkout, setEditingWorkout] = useState<WorkoutTemplate | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutTemplate | null>(null);
  const [importRunOpen, setImportRunOpen] = useState(false);

  const openCreateWorkout = () => {
    setEditingWorkout(null);
    setView('editor');
  };

  const openEditWorkout = (workout: WorkoutTemplate) => {
    setEditingWorkout(workout);
    setView('editor');
  };

  const toggleTheme = () => {
    updateSettings({
      theme: data.settings.theme === 'dark' ? 'light' : 'dark',
    });
  };

  // Full-screen distraction-free workout player (Street Workout or Running)
  if (activeWorkout) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {activeWorkout.discipline === 'running' ? (
          <RunningPlayer
            workout={activeWorkout}
            onFinishSession={addSessionLog}
            onExit={() => setActiveWorkout(null)}
          />
        ) : (
          <WorkoutPlayer
            workout={activeWorkout}
            exerciseMap={exerciseMap}
            settings={data.settings}
            onFinishSession={addSessionLog}
            onExit={() => setActiveWorkout(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r border-slate-200 bg-white p-5 md:flex dark:border-slate-800/80 dark:bg-slate-900/95">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-500 text-slate-950 shadow-md shadow-cyan-500/20">
              <ListChecks className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-lg font-extrabold tracking-tight">StreetFlow</div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Street Workout &amp; Running
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateWorkout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-cyan-500/15 transition hover:bg-cyan-400"
          >
            <Plus className="h-4 w-4" />
            Nouvelle séance
          </button>

          <nav className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                view === item.id || (view === 'editor' && item.id === 'workouts');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-cyan-500/15 dark:text-cyan-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  {item.id === 'workouts' && (
                    <span className="text-xs opacity-70">{data.workouts.length}</span>
                  )}
                  {item.id === 'exercises' && (
                    <span className="text-xs opacity-70">{data.exercises.length}</span>
                  )}
                  {item.id === 'history' && data.history.length > 0 && (
                    <span className="text-xs opacity-70">{data.history.length}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <span>{data.settings.theme === 'dark' ? 'Thème sombre' : 'Thème clair'}</span>
          {data.settings.theme === 'dark' ? (
            <Moon className="h-4 w-4 text-cyan-400" />
          ) : (
            <Sun className="h-4 w-4 text-amber-500" />
          )}
        </button>
      </aside>

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md md:hidden dark:border-slate-800/80 dark:bg-slate-950/90">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-500 text-slate-950">
            <ListChecks className="h-4 w-4 stroke-[2.5]" />
          </div>
          <span className="text-base font-extrabold tracking-tight">StreetFlow</span>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Changer le thème"
          className="rounded-xl border border-slate-200 p-2 text-slate-600 dark:border-slate-800 dark:text-slate-300"
        >
          {data.settings.theme === 'dark' ? (
            <Moon className="h-4 w-4 text-cyan-400" />
          ) : (
            <Sun className="h-4 w-4 text-amber-500" />
          )}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 pt-5 pb-24 md:pl-72 md:pr-8 md:pt-8 md:pb-12">
        {view === 'workouts' && (
          <WorkoutList
            workouts={data.workouts}
            exerciseMap={exerciseMap}
            onStartWorkout={(w) => setActiveWorkout(w)}
            onCreateWorkout={openCreateWorkout}
            onOpenImportRun={() => setImportRunOpen(true)}
            onEditWorkout={openEditWorkout}
            onDuplicateWorkout={duplicateWorkout}
            onDeleteWorkout={deleteWorkout}
          />
        )}

        {view === 'calendar' && (
          <CalendarView
            workouts={data.workouts}
            exercises={data.exercises}
            exerciseMap={exerciseMap}
            history={data.history}
            plannedWorkouts={data.plannedWorkouts}
            programs={data.programs}
            onStartWorkout={(w) => setActiveWorkout(w)}
            onOpenImportRun={() => setImportRunOpen(true)}
            onSavePlannedWorkout={savePlannedWorkout}
            onDeletePlannedWorkout={deletePlannedWorkout}
            onSaveProgram={saveProgram}
            onToggleProgramActive={toggleProgramActive}
            onDeleteProgram={deleteProgram}
            onSaveExercise={saveExercise}
          />
        )}

        {view === 'editor' && (
          <WorkoutEditor
            initialWorkout={editingWorkout}
            exercises={data.exercises}
            exerciseMap={exerciseMap}
            onSaveWorkout={(w) => {
              saveWorkout(w);
              setView('workouts');
            }}
            onSaveExercise={saveExercise}
            onCancel={() => setView('workouts')}
          />
        )}

        {view === 'exercises' && (
          <ExerciseLibrary
            exercises={data.exercises}
            onSaveExercise={saveExercise}
            onDeleteExercise={deleteExercise}
          />
        )}

        {view === 'history' && (
          <WorkoutHistory
            history={data.history}
            onOpenImportRun={() => setImportRunOpen(true)}
            onDeleteLog={deleteSessionLog}
          />
        )}

        {view === 'settings' && (
          <SettingsView
            settings={data.settings}
            onUpdateSettings={updateSettings}
            onExportJson={exportDataJson}
            onImportJson={importDataJson}
            onResetDefaults={resetToDefaults}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 pt-2 pb-safe backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-slate-950/95">
        <div className="grid grid-cols-5 gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              view === item.id || (view === 'editor' && item.id === 'workouts');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-semibold transition ${
                  isActive
                    ? 'text-cyan-600 dark:text-cyan-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
      {/* Strava GPX / FIT Import Modal */}
      {importRunOpen && (
        <RunImportModal
          onImportLog={addSessionLog}
          onSaveAsTemplate={saveWorkout}
          onClose={() => setImportRunOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
