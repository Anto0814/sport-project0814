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
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Réglages &amp; Sauvegarde
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Personnalise ton compagnon et transfère tes séances entre Mac et téléphone.
        </p>
      </div>

      {/* Preferences */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Préférences
        </h2>

        <div className="flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3">
            {settings.theme === 'dark' ? (
              <Moon className="h-5 w-5 text-cyan-400" />
            ) : (
              <Sun className="h-5 w-5 text-amber-500" />
            )}
            <div>
              <div className="font-semibold">Apparence</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Thème sombre recommandé en extérieur
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({
                theme: settings.theme === 'dark' ? 'light' : 'dark',
              })
            }
            className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {settings.theme === 'dark' ? 'Mode sombre' : 'Mode clair'}
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-100 py-2 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Volume2 className="h-5 w-5 text-emerald-500" />
            <div>
              <div className="font-semibold">Bips sonores des chronos</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Compte à rebours 3-2-1 et fin de repos
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
            className="h-5 w-5 accent-cyan-500"
          />
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-100 py-2 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Vibrate className="h-5 w-5 text-violet-500" />
            <div>
              <div className="font-semibold">Vibrations (mobile)</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Signal tactile à la fin du repos (selon navigateur)
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.vibrationEnabled}
            onChange={(e) => onUpdateSettings({ vibrationEnabled: e.target.checked })}
            className="h-5 w-5 accent-cyan-500"
          />
        </div>
      </section>

      {/* Export / Import JSON */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Sauvegarde &amp; Synchronisation manuelle (JSON)
          </h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Tes séances sont stockées localement dans ton navigateur. Exporte un fichier JSON pour sauvegarder ou envoyer tes séances de ton Mac vers ton téléphone.
          </p>
        </div>

        {feedback && (
          <div
            className={`rounded-xl px-4 py-3 text-sm font-medium ${
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
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            <Download className="h-4 w-4" />
            Exporter mes données (.json)
          </button>

          <div className="flex flex-1 items-center gap-2">
            <select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="merge">Fusionner</option>
              <option value="replace">Remplacer tout</option>
            </select>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
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

        <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
          {confirmReset ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-rose-500/10 p-3 text-xs">
              <span className="font-medium text-rose-600 dark:text-rose-300">
                Réinitialiser avec les séances et exercices d&apos;exemple ?
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-lg px-3 py-1.5 font-medium hover:bg-slate-200 dark:hover:bg-slate-800"
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
                  className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white"
                >
                  Confirmer
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-rose-500"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Réinitialiser les données de démo
            </button>
          )}
        </div>
      </section>

      {/* Mini guide */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 font-semibold">
            <Smartphone className="h-4 w-4 text-cyan-500" />
            Tester sur mobile en local
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Lance <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">npm run dev:lan</code> sur ton Mac et ouvre l&apos;adresse réseau affichée sur ton téléphone (même Wi-Fi). Tu peux ensuite l&apos;ajouter à l&apos;écran d&apos;accueil.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 font-semibold">
            <GitBranch className="h-4 w-4 text-emerald-500" />
            Prêt pour GitHub Pages
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Le workflow <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">.github/workflows/deploy.yml</code> est déjà inclus : active simplement GitHub Pages (Source : GitHub Actions) dans les paramètres de ton futur dépôt.
          </p>
        </div>
      </section>
    </div>
  );
}
