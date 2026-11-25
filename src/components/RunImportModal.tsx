import { useRef, useState } from 'react';
import { Check, FileUp, Loader2, Upload, X } from 'lucide-react';
import { WorkoutSessionLog, WorkoutTemplate } from '../types/workout';
import { formatDateFr, generateId } from '../utils/format';
import { ParsedRunResult, parseRunFile } from '../utils/runParser';
import { RunStatsCard } from './RunStatsCard';
import { ToggleSwitch } from './ToggleSwitch';

interface RunImportModalProps {
  onImportLog: (log: WorkoutSessionLog) => void;
  onSaveAsTemplate?: (template: WorkoutTemplate) => void;
  onClose: () => void;
}

export function RunImportModal({
  onImportLog,
  onSaveAsTemplate,
  onClose,
}: RunImportModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [parsed, setParsed] = useState<ParsedRunResult | null>(null);
  const [customName, setCustomName] = useState('');
  const [alsoCreateTemplate, setAlsoCreateTemplate] = useState(false);

  const processFile = async (file: File) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await parseRunFile(file);
      setParsed(result);
      setCustomName(result.name);
    } catch (err) {
      setParsed(null);
      setErrorMsg(
        err instanceof Error ? err.message : 'Erreur lors de la lecture du fichier.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleConfirmImport = () => {
    if (!parsed) return;
    const finalName = customName.trim() || parsed.name;
    const templateId = generateId('wk');

    const log: WorkoutSessionLog = {
      id: generateId('log'),
      workoutId: templateId,
      workoutName: finalName,
      discipline: 'running',
      startedAt: parsed.startedAtIso,
      finishedAt: parsed.finishedAtIso,
      durationSec: parsed.stats.movingDurationSec,
      totalSetsCompleted: parsed.stats.splits.length || 1,
      exercises: [],
      runStats: parsed.stats,
    };

    onImportLog(log);

    if (alsoCreateTemplate && onSaveAsTemplate) {
      const now = new Date().toISOString();
      onSaveAsTemplate({
        id: templateId,
        name: finalName,
        discipline: 'running',
        accent: 'emerald',
        exercises: [],
        runningConfig: {
          runType: 'endurance',
          targetDistanceKm: parsed.stats.distanceKm,
          targetDurationSec: parsed.stats.movingDurationSec,
          notes: `Modèle créé depuis ${parsed.stats.sourceFileName ?? 'Strava'}`,
        },
        createdAt: now,
        updatedAt: now,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="surface-card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl p-5 pb-safe sm:rounded-3xl sm:p-6 animate-view-in">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">
              Importer une course Strava
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Analyse 100% locale (.GPX / .FIT) : allure moyenne, vitesse, temps au km et temps d&apos;arrêt exacts.
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary p-2">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`mt-5 cursor-pointer rounded-2xl border-2 border-dashed p-7 text-center transition ${
            dragging
              ? 'border-emerald-400 bg-emerald-500/10'
              : 'border-slate-300 bg-slate-50/70 hover:border-cyan-400 dark:border-white/15 dark:bg-white/[0.02]'
          }`}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
              <span className="text-sm font-bold">Analyse des points GPS...</span>
            </div>
          ) : (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 text-emerald-500">
                <FileUp className="h-6 w-6" />
              </div>
              <div className="mt-3 text-sm font-bold">
                Clique ou glisse un fichier{' '}
                <code className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-cyan-600 dark:text-cyan-300">
                  .gpx
                </code>{' '}
                ou{' '}
                <code className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-300">
                  .fit
                </code>
              </div>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Sur Strava web : Activité → menu « ••• » → Exporter GPX ou Exporter l&apos;original (.FIT).
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".gpx,.fit"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        {parsed && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                  Nom de la séance
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="input-field font-semibold"
                />
              </div>
              <div className="surface-inset flex flex-col justify-center px-4 py-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Date détectée
                </span>
                <span className="mt-0.5 text-sm font-bold capitalize">
                  {formatDateFr(parsed.startedAtIso)}
                </span>
              </div>
            </div>

            <RunStatsCard stats={parsed.stats} />

            {onSaveAsTemplate && (
              <div className="surface-inset flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Créer aussi un modèle réutilisable dans « Mes séances »
                </span>
                <ToggleSwitch
                  checked={alsoCreateTemplate}
                  onChange={setAlsoCreateTemplate}
                  ariaLabel="Créer aussi un modèle"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary px-4 py-2.5 text-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="btn-primary px-5 py-2.5 text-sm"
              >
                <Check className="h-4 w-4 stroke-[2.5]" />
                Ajouter à l&apos;historique &amp; calendrier
              </button>
            </div>
          </div>
        )}

        {!parsed && (
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="btn-primary px-5 py-2.5 text-sm"
            >
              <Upload className="h-4 w-4" />
              Choisir un fichier
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
