import { useRef, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  CloudOff,
  Download,
  GitBranch,
  Loader2,
  LogOut,
  Moon,
  MoreVertical,
  PlusSquare,
  RotateCcw,
  Share,
  ShieldCheck,
  Smartphone,
  Sun,
  Upload,
  User,
  Vibrate,
  Volume2,
} from 'lucide-react';
import type { SyncStatus } from '../hooks/useAppStore';
import type { usePwaInstall } from '../hooks/usePwaInstall';
import { AppSettings, UserProfile } from '../types/workout';
import { ToggleSwitch } from './ToggleSwitch';

interface SettingsViewProps {
  settings: AppSettings;
  profile: UserProfile | null;
  syncStatus: SyncStatus;
  pwa: ReturnType<typeof usePwaInstall>;
  onSignOut: () => Promise<void>;
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
  profile,
  syncStatus,
  pwa,
  onSignOut,
  onUpdateSettings,
  onExportJson,
  onImportJson,
  onResetDefaults,
}: SettingsViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [installTab, setInstallTab] = useState<'ios' | 'android'>(
    pwa.isAndroid ? 'android' : 'ios'
  );

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
          Compte, installation en application mobile (iOS &amp; Android) et préférences.
        </p>
      </div>

      {/* Account & Cloud Sync */}
      {profile && (
        <section className="surface-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className={`font-display flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold ${
                  profile.role === 'admin'
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950'
                    : 'bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950'
                }`}
              >
                {profile.role === 'admin' ? (
                  <ShieldCheck className="h-6 w-6" />
                ) : (
                  <User className="h-6 w-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-bold">
                    {profile.username}
                  </span>
                  {profile.role === 'admin' && (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-600 dark:text-amber-300">
                      Admin
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {syncStatus === 'syncing' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-500" />
                      Synchronisation Supabase en cours...
                    </>
                  ) : syncStatus === 'error' ? (
                    <>
                      <CloudOff className="h-3.5 w-3.5 text-rose-500" />
                      Mode hors-ligne (sauvegardé localement)
                    </>
                  ) : (
                    <>
                      <Cloud className="h-3.5 w-3.5 text-emerald-500" />
                      Synchronisé automatiquement sur Supabase
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void onSignOut()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-300"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
          </div>
        </section>
      )}

      {/* Install Mobile App / PWA Guide (iOS Safari + Android) */}
      <section className="surface-card space-y-4 border-cyan-500/25 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-emerald-400/20 text-cyan-500">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold sm:text-lg">
                Installer StreetFlow sur ton téléphone
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Transforme le site en vraie application plein écran (avec icône sur l&apos;écran d&apos;accueil et mode hors-ligne).
              </p>
            </div>
          </div>

          {pwa.isStandalone && (
            <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              App installée
            </span>
          )}
        </div>

        {/* Native 1-click install CTA when supported (Android Chrome / Desktop) */}
        {pwa.canPromptInstall && (
          <button
            type="button"
            onClick={() => void pwa.promptInstall()}
            className="btn-primary w-full py-3.5 text-sm"
          >
            <Download className="h-4 w-4" />
            Installer l&apos;application StreetFlow maintenant
          </button>
        )}

        {/* iOS non-Safari warning if detected */}
        {pwa.isIos && !pwa.isSafari && !pwa.isStandalone && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
            Tu sembles être sur iOS hors de Safari. Pour créer l&apos;application web sur iPhone / iPad, ouvre d&apos;abord ce lien dans <strong>Safari</strong>.
          </div>
        )}

        {/* Platform tabs */}
        <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-white/[0.07] dark:bg-[#070a0f]/80">
          <button
            type="button"
            onClick={() => setInstallTab('ios')}
            className={`rounded-lg py-2 text-xs font-bold transition ${
              installTab === 'ios'
                ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            iPhone / iPad (Safari)
          </button>
          <button
            type="button"
            onClick={() => setInstallTab('android')}
            className={`rounded-lg py-2 text-xs font-bold transition ${
              installTab === 'android'
                ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Android (Chrome / PWA)
          </button>
        </div>

        {installTab === 'ios' ? (
          <ol className="space-y-2.5 text-xs">
            <li className="surface-inset flex items-start gap-3 p-3.5">
              <span className="font-display flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-xs font-bold text-cyan-600 dark:text-cyan-300">
                1
              </span>
              <div className="leading-relaxed">
                <strong className="text-slate-900 dark:text-slate-100">
                  Ouvre StreetFlow dans Safari
                </strong>{' '}
                <span className="text-slate-500 dark:text-slate-400">
                  (obligatoire sur iOS : l&apos;installation en app web fonctionne uniquement depuis Safari).
                </span>
              </div>
            </li>

            <li className="surface-inset flex items-start gap-3 p-3.5">
              <span className="font-display flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-xs font-bold text-cyan-600 dark:text-cyan-300">
                2
              </span>
              <div className="leading-relaxed">
                <strong className="inline-flex items-center gap-1 text-slate-900 dark:text-slate-100">
                  Appuie sur le bouton Partager{' '}
                  <Share className="inline h-3.5 w-3.5 text-cyan-500" />
                </strong>{' '}
                <span className="text-slate-500 dark:text-slate-400">
                  situé dans la barre en bas au centre de l&apos;écran (icône carré avec une flèche vers le haut).
                </span>
              </div>
            </li>

            <li className="surface-inset flex items-start gap-3 p-3.5">
              <span className="font-display flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-xs font-bold text-cyan-600 dark:text-cyan-300">
                3
              </span>
              <div className="leading-relaxed">
                <strong className="inline-flex items-center gap-1 text-slate-900 dark:text-slate-100">
                  Fais défiler et choisis « Sur l&apos;écran d&apos;accueil »{' '}
                  <PlusSquare className="inline h-3.5 w-3.5 text-emerald-500" />
                </strong>
                <span className="text-slate-500 dark:text-slate-400">
                  . Vérifie que « Ouvrir comme app web » est bien activé si proposé.
                </span>
              </div>
            </li>

            <li className="surface-inset flex items-start gap-3 p-3.5">
              <span className="font-display flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                4
              </span>
              <div className="leading-relaxed">
                <strong className="text-slate-900 dark:text-slate-100">
                  Appuie sur « Ajouter » en haut à droite.
                </strong>{' '}
                <span className="text-slate-500 dark:text-slate-400">
                  L&apos;icône StreetFlow apparaît sur ton écran d&apos;accueil et s&apos;ouvre en plein écran sans barre Safari !
                </span>
              </div>
            </li>
          </ol>
        ) : (
          <ol className="space-y-2.5 text-xs">
            <li className="surface-inset flex items-start gap-3 p-3.5">
              <span className="font-display flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-xs font-bold text-cyan-600 dark:text-cyan-300">
                1
              </span>
              <div className="leading-relaxed">
                <strong className="text-slate-900 dark:text-slate-100">
                  Ouvre StreetFlow dans Chrome, Edge ou Brave.
                </strong>{' '}
                <span className="text-slate-500 dark:text-slate-400">
                  Si le bouton « Installer l&apos;application » s&apos;affiche ci-dessus, un seul clic suffit !
                </span>
              </div>
            </li>

            <li className="surface-inset flex items-start gap-3 p-3.5">
              <span className="font-display flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-xs font-bold text-cyan-600 dark:text-cyan-300">
                2
              </span>
              <div className="leading-relaxed">
                <strong className="inline-flex items-center gap-1 text-slate-900 dark:text-slate-100">
                  Appuie sur le menu{' '}
                  <MoreVertical className="inline h-3.5 w-3.5 text-cyan-500" /> en haut à droite
                </strong>{' '}
                <span className="text-slate-500 dark:text-slate-400">
                  puis sélectionne <strong>« Installer l&apos;application »</strong> ou{' '}
                  <strong>« Ajouter à l&apos;écran d&apos;accueil »</strong>.
                </span>
              </div>
            </li>

            <li className="surface-inset flex items-start gap-3 p-3.5">
              <span className="font-display flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                3
              </span>
              <div className="leading-relaxed">
                <strong className="text-slate-900 dark:text-slate-100">
                  Confirme en appuyant sur « Installer ».
                </strong>{' '}
                <span className="text-slate-500 dark:text-slate-400">
                  L&apos;application StreetFlow s&apos;ajoute à ton tiroir d&apos;applications et fonctionne même hors-ligne au parc.
                </span>
              </div>
            </li>
          </ol>
        )}
      </section>

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
            Sauvegarde locale (JSON)
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            En plus de la synchro cloud Supabase, tu peux exporter ou importer une sauvegarde manuelle de toutes tes données.
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

      {/* Dev / Hosting card */}
      <section className="surface-card p-5">
        <div className="flex items-center gap-2 font-display font-bold">
          <GitBranch className="h-4 w-4 text-emerald-500" />
          Déploiement &amp; Synchronisation
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          Hébergé via GitHub Pages (HTTPS requis pour l&apos;installation PWA complète et le mode hors-ligne) avec base de données Supabase synchronisée sur tous tes appareils.
        </p>
      </section>
    </div>
  );
}
