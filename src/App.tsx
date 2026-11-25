import { useState } from 'react';
import {
  CalendarDays,
  Cloud,
  CloudOff,
  Dumbbell,
  FileUp,
  Flame,
  History,
  Loader2,
  LogOut,
  Moon,
  Plus,
  Settings,
  ShieldCheck,
  Sun,
  Zap,
} from 'lucide-react';
import { AdminPanel } from './components/AdminPanel';
import { AuthScreen } from './components/AuthScreen';
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
import { useAuth } from './hooks/useAuth';
import { usePwaInstall } from './hooks/usePwaInstall';
import { AppView, WorkoutTemplate } from './types/workout';

const BASE_NAV_ITEMS: {
  id: Exclude<AppView, 'editor' | 'admin'>;
  label: string;
  shortLabel: string;
  icon: typeof Dumbbell;
}[] = [
  { id: 'workouts', label: 'Mes séances', shortLabel: 'Séances', icon: Flame },
  { id: 'calendar', label: 'Calendrier', shortLabel: 'Agenda', icon: CalendarDays },
  { id: 'exercises', label: 'Exercices', shortLabel: 'Exos', icon: Dumbbell },
  { id: 'history', label: 'Historique', shortLabel: 'Suivi', icon: History },
  { id: 'settings', label: 'Réglages', shortLabel: 'Réglages', icon: Settings },
];

export function App() {
  const auth = useAuth();
  const pwa = usePwaInstall();
  const {
    data,
    syncStatus,
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
  } = useAppStore(auth.user?.id ?? null);

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

  const handleSignOut = async () => {
    setActiveWorkout(null);
    setEditingWorkout(null);
    setView('workouts');
    await auth.signOut();
  };

  // Initial auth session hydration splash
  if (auth.loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950 shadow-xl shadow-cyan-500/25">
          <Zap className="h-8 w-8 fill-current" />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
          Chargement de ta session…
        </div>
      </div>
    );
  }

  // Unauthenticated -> Auth Screen (Pseudo + 4-digit numeric PIN)
  if (!auth.session) {
    return <AuthScreen onSignIn={auth.signIn} onSignUp={auth.signUp} />;
  }

  const activeProgramsCount = data.programs.filter((p) => p.isActive).length;

  // Full-screen distraction-free workout player (Street Workout or Running)
  if (activeWorkout) {
    return (
      <div className="min-h-screen px-4 pb-4 pt-safe">
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
    <div className="min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[268px] flex-col justify-between border-r border-slate-200/80 bg-white/85 p-5 backdrop-blur-xl md:flex dark:border-white/[0.06] dark:bg-[#0a0f18]/85">
        <div className="space-y-6">
          {/* Brand */}
          <div className="flex items-center gap-3 px-1">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 shadow-lg shadow-cyan-500/25">
              <Zap className="h-5 w-5 fill-current stroke-[2.2]" />
            </div>
            <div>
              <div className="font-display text-xl font-bold tracking-tight">
                StreetFlow
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {syncStatus === 'syncing' ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                    Synchro…
                  </>
                ) : syncStatus === 'error' ? (
                  <>
                    <CloudOff className="h-3 w-3 text-rose-400" />
                    Hors-ligne
                  </>
                ) : (
                  <>
                    <Cloud className="h-3 w-3 text-emerald-400" />
                    Cloud actif
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={openCreateWorkout}
              className="btn-primary w-full px-4 py-2.5 text-sm"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Nouvelle séance
            </button>
            <button
              type="button"
              onClick={() => setImportRunOpen(true)}
              className="btn-secondary w-full px-3.5 py-2 text-xs"
            >
              <FileUp className="h-3.5 w-3.5 text-emerald-500" />
              Importer Strava GPX / FIT
            </button>
          </div>

          {/* Nav */}
          <nav className="space-y-1">
            {BASE_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                view === item.id || (view === 'editor' && item.id === 'workouts');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={`group relative flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/15 to-emerald-500/10 text-cyan-700 ring-1 ring-cyan-500/25 dark:text-cyan-300'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-100'
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-2 bottom-2 left-0 w-1 rounded-r-full bg-gradient-to-b from-cyan-400 to-emerald-400" />
                  )}
                  <span className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 transition ${
                        isActive
                          ? 'text-cyan-500 dark:text-cyan-400'
                          : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                      }`}
                    />
                    {item.label}
                  </span>
                  {item.id === 'workouts' && (
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
                      {data.workouts.length}
                    </span>
                  )}
                  {item.id === 'calendar' && activeProgramsCount > 0 && (
                    <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      {activeProgramsCount} actif{activeProgramsCount > 1 ? 's' : ''}
                    </span>
                  )}
                  {item.id === 'exercises' && (
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
                      {data.exercises.length}
                    </span>
                  )}
                  {item.id === 'history' && data.history.length > 0 && (
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
                      {data.history.length}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Admin-only navigation tab */}
            {auth.isAdmin && (
              <button
                type="button"
                onClick={() => setView('admin')}
                className={`group relative flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 ${
                  view === 'admin'
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300'
                    : 'text-amber-700/80 hover:bg-amber-500/10 dark:text-amber-400/80 dark:hover:bg-amber-500/10'
                }`}
              >
                {view === 'admin' && (
                  <span className="absolute top-2 bottom-2 left-0 w-1 rounded-r-full bg-gradient-to-b from-amber-400 to-orange-500" />
                )}
                <span className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-amber-500" />
                  Administration
                </span>
                <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-600 dark:text-amber-300">
                  Admin
                </span>
              </button>
            )}
          </nav>
        </div>

        {/* Footer: Account pill + Theme switcher */}
        <div className="space-y-3 border-t border-slate-200/70 pt-4 dark:border-white/[0.06]">
          <div className="surface-inset flex items-center justify-between gap-2 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-xs font-bold">
                {auth.profile?.username ?? 'Compte'}
              </div>
              <div className="text-[10px] font-semibold text-slate-500">
                {auth.isAdmin ? 'Administrateur' : 'Connecté'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              title="Se déconnecter"
              aria-label="Se déconnecter"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-500"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-white/[0.07] dark:bg-white/[0.03]">
            <button
              type="button"
              onClick={() => updateSettings({ theme: 'light' })}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
                data.settings.theme === 'light'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              Clair
            </button>
            <button
              type="button"
              onClick={() => updateSettings({ theme: 'dark' })}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
                data.settings.theme === 'dark'
                  ? 'bg-slate-800 text-cyan-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Moon className="h-3.5 w-3.5 text-cyan-400" />
              Sombre
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 pb-3 pt-safe backdrop-blur-xl md:hidden dark:border-white/[0.06] dark:bg-[#070a0f]/80">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950 shadow-md shadow-cyan-500/20">
            <Zap className="h-4 w-4 fill-current" />
          </div>
          <div>
            <div className="font-display text-sm font-bold leading-tight">
              StreetFlow
            </div>
            <div className="text-[10px] font-semibold text-slate-500">
              {auth.profile?.username}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {auth.isAdmin && (
            <button
              type="button"
              onClick={() => setView('admin')}
              aria-label="Panel administrateur"
              className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-2 text-[11px] font-bold transition ${
                view === 'admin'
                  ? 'border-amber-400 bg-amber-400 text-slate-950'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin
            </button>
          )}
          <button
            type="button"
            onClick={() => setImportRunOpen(true)}
            aria-label="Importer GPX ou FIT"
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400"
          >
            <FileUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Changer le thème"
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300"
          >
            {data.settings.theme === 'dark' ? (
              <Moon className="h-4 w-4 text-cyan-400" />
            ) : (
              <Sun className="h-4 w-4 text-amber-500" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 pt-5 pb-28 md:pl-[300px] md:pr-8 md:pt-8 md:pb-14">
        <div key={view} className="animate-view-in">
          {view === 'workouts' && (
            <WorkoutList
              workouts={data.workouts}
              history={data.history}
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
              profile={auth.profile}
              syncStatus={syncStatus}
              pwa={pwa}
              onSignOut={handleSignOut}
              onUpdateSettings={updateSettings}
              onExportJson={exportDataJson}
              onImportJson={importDataJson}
              onResetDefaults={resetToDefaults}
            />
          )}

          {view === 'admin' && auth.isAdmin && <AdminPanel />}
        </div>
      </main>

      {/* Mobile Floating Glass Bottom Dock */}
      <nav className="fixed inset-x-3 bottom-3 z-30 rounded-2xl border border-slate-200/90 bg-white/90 px-1.5 py-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.18)] backdrop-blur-xl md:hidden dark:border-white/10 dark:bg-[#0d121c]/90 dark:shadow-[0_16px_40px_rgba(0,0,0,0.65)]">
        <div className="grid grid-cols-5 gap-1">
          {BASE_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              view === item.id || (view === 'editor' && item.id === 'workouts');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={`relative flex flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-b from-cyan-500/18 to-emerald-500/10 text-cyan-600 dark:text-cyan-300'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'stroke-[2.5]' : ''}`} />
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
