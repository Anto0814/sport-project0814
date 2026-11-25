import { useRef, useState } from 'react';
import {
  Download,
  GitBranch,
  Moon,
  RotateCcw,
  Smartphone,
  Sun,
  Upload,
  Vibrate,
  Volume2,
} from 'lucide-react';
import { AppSettings } from '../types/workout';
import { ToggleSwitch } from './ToggleSwitch';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onExportJson: () => void;
  onImportJson: (
    raw: string,
    mode: 'replace' | 'merge'
  ) => { ok: boolean; message: string };
  onResetDefaults: () => void;
}

export function SettingsView({
  settings,
  onUpdateSettings,
  onExportJson,
  onImportJson,
  onResetDefaults,
}: SettingsViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = onImportJson(text, importMode);
    setFeedback(res);
    e.target.value = '';
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Réglages &amp; Sauvegarde
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Personnalise l&apos;expérience et sauvegarde tes séances entre ton Mac et ton téléphone.
        </p>
      </div>

      {/* Preferences */}
      <section className="surface-card space-y-2 p-5 sm:p-6">
        <h2 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-slate-500">
          Préférences
        </h2>

        <div className="flex items-center justify-between gap-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-500">
              {settings.theme === 'dark' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <div>
              <div className="font-bold">Mode sombre</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Contraste optimisé pour l&apos;extérieur et le soir
              </div>
            </div>
          </div>
          <ToggleSwitch
            checked={settings.theme === 'dark'}
            onChange={(dark) => onUpdateSettings({ theme: dark ? 'dark' : 'light' })}
            ariaLabel="Mode sombre"
          />
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-100 py-2.5 dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <Volume2 className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold">Bips sonores des chronos</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Compte à rebours 3-2-1 et signal de fin de repos
              </div>
            </div>
          </div>
          <ToggleSwitch
            checked={settings.soundEnabled}
            onChange={(v) => onUpdateSettings({ soundEnabled: v })}
            ariaLabel="Bips sonores"
          />
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-100 py-2.5 dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-500">
              <Vibrate className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold">Vibrations (mobile)</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Signal tactile à la fin du repos (selon appareil)
              </div>
            </div>
          </div>
          <ToggleSwitch
            checked={settings.vibrationEnabled}
            onChange={(v) => onUpdateSettings({ vibrationEnabled: v })}
            ariaLabel="Vibrations"
          />
        </div>
      </section>

      {/* Export / Import JSON */}
      <section className="surface-card space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
            Sauvegarde &amp; Transfert (JSON)
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Tes données (séances, calendrier, programmes, courses Strava) sont sauvegardées localement. Exporte un fichier JSON pour sauvegarder ou transférer entre appareils.
          </p>
        </div>

        {feedback && (
          <div
            className={`rounded-xl px-4 py-3 text-sm font-semibold ${
              feedback.ok
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onExportJson}
            className="btn-primary flex-1 px-4 py-3 text-sm"
          >
            <Download className="h-4 w-4" />
            Exporter mes données (.json)
          </button>

          <div className="flex flex-1 items-center gap-2">
            <select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')}
              className="input-field w-auto py-3 text-xs font-semibold"
            >
              <option value="merge">Fusionner</option>
              <option value="replace">Remplacer</option>
            </select>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary flex-1 px-4 py-3 text-sm"
            >
              <Upload className="h-4 w-4" />
              Importer (.json)
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 dark:border-white/[0.06]">
          {confirmReset ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-rose-500/10 p-3 text-xs">
              <span className="font-semibold text-rose-600 dark:text-rose-300">
                Réinitialiser avec les séances et exercices d&apos;exemple ?
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-lg px-3 py-1.5 font-semibold hover:bg-slate-200 dark:hover:bg-white/10"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetDefaults();
                    setConfirmReset(false);
                    setFeedback({ ok: true, message: 'Données par défaut restaurées.' });
                  }}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 font-bold text-white"
                >
                  Confirmer
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-rose-500"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Réinitialiser les données de démo
            </button>
          )}
        </div>
      </section>

      {/* Quick tips */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="surface-card p-5">
          <div className="flex items-center gap-2 font-display font-bold">
            <Smartphone className="h-4 w-4 text-cyan-500" />
            Tester sur mobile en local
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Lance{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-white/[0.08]">
              npm run dev:lan
            </code>{' '}
            sur ton Mac puis ouvre l&apos;adresse réseau affichée sur ton smartphone (même Wi-Fi).
          </p>
        </div>

        <div className="surface-card p-5">
          <div className="flex items-center gap-2 font-display font-bold">
            <GitBranch className="h-4 w-4 text-emerald-500" />
            Déploiement GitHub Pages
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Chaque push sur <code className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-white/[0.08]">main</code> déclenche automatiquement le build et la mise en ligne via GitHub Actions.
          </p>
        </div>
      </section>
    </div>
  );
}
