import { useRef, useState } from 'react';
import { Check, FileUp, Loader2, Upload, X } from 'lucide-react';
import { WorkoutSessionLog, WorkoutTemplate } from '../types/workout';
import { formatDateFr, generateId } from '../utils/format';
import { ParsedRunResult, parseRunFile } from '../utils/runParser';
import { RunStatsCard } from './RunStatsCard';

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
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 pb-safe shadow-2xl sm:rounded-3xl sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold sm:text-xl">
              Importer une course Strava (.GPX / .FIT)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Analyse 100% locale : recalcul exact de la vitesse, allure moyenne, temps au km et temps d&apos;arrêt.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
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
          className={`mt-4 cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
            dragging
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-slate-300 bg-slate-50/70 hover:border-cyan-500/60 dark:border-slate-700 dark:bg-slate-950/60'
          }`}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
              <span className="text-sm font-semibold">Analyse des points GPS...</span>
            </div>
          ) : (
            <>
              <FileUp className="mx-auto h-9 w-9 text-emerald-500" />
              <div className="mt-2 text-sm font-bold">
                Clique ou glisse un fichier <code className="text-cyan-500">.gpx</code> ou{' '}
                <code className="text-cyan-500">.fit</code>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
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
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Nom de la séance
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
              <div className="flex flex-col justify-end rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 dark:border-slate-800 dark:bg-slate-950">
                <span className="text-[11px] font-medium text-slate-500">
                  Date détectée dans le GPS
                </span>
                <span className="text-sm font-bold capitalize">
                  {formatDateFr(parsed.startedAtIso)}
                </span>
              </div>
            </div>

            <RunStatsCard stats={parsed.stats} />

            {onSaveAsTemplate && (
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium dark:border-slate-800 dark:bg-slate-950">
                <input
                  type="checkbox"
                  checked={alsoCreateTemplate}
                  onChange={(e) => setAlsoCreateTemplate(e.target.checked)}
                  className="h-4 w-4 accent-emerald-500"
                />
                Enregistrer aussi cette distance/durée comme modèle dans « Mes séances »
              </label>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
              >
                <Check className="h-4 w-4" />
                Ajouter à l&apos;historique &amp; au calendrier
              </button>
            </div>
          </div>
        )}

        {!parsed && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
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
