import { useRef, useState } from 'react';
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  User,
  UserPlus,
  Zap,
} from 'lucide-react';
import type { AuthResult } from '../hooks/useAuth';

interface AuthScreenProps {
  onSignIn: (username: string, pin: string) => Promise<AuthResult>;
  onSignUp: (username: string, pin: string) => Promise<AuthResult>;
}

interface PinCodeInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  showDigits: boolean;
  autoFocus?: boolean;
}

function PinCodeInput({
  id,
  label,
  value,
  onChange,
  showDigits,
  autoFocus,
}: PinCodeInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [focused, setFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow navigation, editing, and clipboard shortcuts
    if (
      e.ctrlKey ||
      e.metaKey ||
      [
        'Backspace',
        'Delete',
        'Tab',
        'Enter',
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End',
      ].includes(e.key)
    ) {
      return;
    }
    // Strictly lock input to digits 0-9
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
    onChange(digitsOnly);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    onChange(pasted);
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400"
      >
        <Lock className="h-3.5 w-3.5 text-cyan-500" />
        {label}
      </label>

      <div
        onClick={() => inputRef.current?.focus()}
        className="relative cursor-text"
      >
        {/* Strictly numeric input for mobile 0-9 keypad + desktop keyboard lock */}
        <input
          ref={inputRef}
          id={id}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          autoComplete="off"
          autoFocus={autoFocus}
          value={value}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          onPaste={handlePaste}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label={label}
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
        />

        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((slotIdx) => {
            const digit = value[slotIdx];
            const isActive =
              focused &&
              (slotIdx === value.length || (value.length === 4 && slotIdx === 3));

            return (
              <div
                key={slotIdx}
                className={`font-display flex h-15 items-center justify-center rounded-2xl border text-2xl font-bold transition-all ${
                  isActive
                    ? 'border-cyan-400 bg-cyan-500/10 ring-2 ring-cyan-400/30'
                    : digit
                      ? 'border-emerald-500/40 bg-slate-100 dark:border-emerald-400/30 dark:bg-white/[0.06]'
                      : 'border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#070a0f]/90'
                }`}
              >
                {digit ? (
                  showDigits ? (
                    <span className="tabular-nums">{digit}</span>
                  ) : (
                    <span className="h-3 w-3 rounded-full bg-slate-900 dark:bg-cyan-300" />
                  )
                ) : isActive ? (
                  <span className="h-6 w-0.5 animate-pulse rounded-full bg-cyan-400" />
                ) : (
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AuthScreen({ onSignIn, onSignUp }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showDigits, setShowDigits] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setErrorMsg('');
    setPin('');
    setConfirmPin('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedUser = username.trim();
    if (trimmedUser.length < 3) {
      setErrorMsg('Le pseudo doit contenir au moins 3 caractères.');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setErrorMsg('Entre un code PIN de 4 chiffres.');
      return;
    }
    if (mode === 'register' && pin !== confirmPin) {
      setErrorMsg('Les deux codes PIN ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    const result =
      mode === 'login'
        ? await onSignIn(trimmedUser, pin)
        : await onSignUp(trimmedUser, pin);

    if (!result.ok) {
      setErrorMsg(result.error ?? 'Une erreur est survenue.');
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6 animate-view-in">
        {/* Brand header */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 shadow-xl shadow-cyan-500/25">
            <Zap className="h-8 w-8 fill-current stroke-[2.2]" />
          </div>
          <h1 className="font-display mt-4 text-3xl font-bold tracking-tight">
            StreetFlow
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Street Workout &amp; Running — synchronisé dans le cloud.
          </p>
        </div>

        {/* Auth Card */}
        <div className="surface-card relative overflow-hidden p-6 sm:p-7">
          <div className="pointer-events-none absolute -top-20 -right-20 h-44 w-44 rounded-full bg-cyan-500/15 blur-3xl" />

          {/* Mode tabs */}
          <div className="relative grid grid-cols-2 gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-white/[0.07] dark:bg-[#070a0f]/80">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              Connexion
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Créer un compte
            </button>
          </div>

          <form onSubmit={handleSubmit} className="relative mt-6 space-y-5">
            {/* Username */}
            <div>
              <label
                htmlFor="auth-username"
                className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400"
              >
                <User className="h-3.5 w-3.5 text-cyan-500" />
                Pseudo
              </label>
              <input
                id="auth-username"
                type="text"
                required
                minLength={3}
                maxLength={24}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Ex : Anto0814"
                className="input-field py-3 text-base font-semibold"
              />
            </div>

            {/* 4-digit numeric PIN */}
            <PinCodeInput
              id="auth-pin"
              label="Code PIN (4 chiffres uniquement)"
              value={pin}
              onChange={(next) => {
                setPin(next);
                setErrorMsg('');
              }}
              showDigits={showDigits}
            />

            {mode === 'register' && (
              <PinCodeInput
                id="auth-pin-confirm"
                label="Confirmer le code PIN (4 chiffres)"
                value={confirmPin}
                onChange={(next) => {
                  setConfirmPin(next);
                  setErrorMsg('');
                }}
                showDigits={showDigits}
              />
            )}

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Session persistante sur cet appareil
              </span>
              <button
                type="button"
                onClick={() => setShowDigits((v) => !v)}
                className="inline-flex items-center gap-1 font-semibold text-cyan-600 hover:underline dark:text-cyan-400"
              >
                {showDigits ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    Masquer
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    Afficher
                  </>
                )}
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-600 dark:text-rose-300">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3.5 text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === 'login' ? 'Connexion...' : 'Création du compte...'}
                </>
              ) : mode === 'login' ? (
                <>
                  <LogIn className="h-4 w-4" />
                  Se connecter
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Créer mon compte
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
