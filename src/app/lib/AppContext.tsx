// src/app/lib/AppContext.tsx — Global app settings context
// Appearance settings (color mode, accent, language) are scoped per user account.
// Guests always use light mode. Signed-in users can choose light, dark, or auto.
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getUser } from './api';

export type ColorMode  = 'light' | 'auto' | 'dark';
export type AccentKey  = 'blue' | 'neutral' | 'violet' | 'green' | 'orange' | 'red' | 'rose' | 'indigo' | 'yellow';
export type AppLanguage = 'en' | 'vi';

export const ACCENT_MAP: Record<AccentKey, string> = {
  blue:    '#1a6fd4',
  neutral: '#6b7280',
  violet:  '#7c3aed',
  green:   '#16a34a',
  orange:  '#f97316',
  red:     '#dc2626',
  rose:    '#e11d48',
  indigo:  '#4f46e5',
  yellow:  '#ca8a04',
};

interface AppContextValue {
  colorMode:    ColorMode;
  setColorMode: (m: ColorMode) => void;
  accentKey:    AccentKey;
  setAccentKey: (k: AccentKey) => void;
  isDark:       boolean;
  language:     AppLanguage;
  setLanguage:  (l: AppLanguage) => void;
  /** true when no user is logged in — appearance settings are locked */
  isGuest:      boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

// ── helpers ────────────────────────────────────────────────────────────────────

function prefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

/** Build a namespaced localStorage key for the current user (or 'guest'). */
function userKey(base: string, userId?: number): string {
  return userId != null ? `${base}_u${userId}` : base;
}

/** Read a per-user value from localStorage, falling back to the default. */
function readPref<T extends string>(base: string, userId: number | undefined, fallback: T): T {
  const key = userKey(base, userId);
  return (localStorage.getItem(key) as T | null) ?? fallback;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  // Resolve the logged-in user at mount time
  const [userId, setUserId] = useState<number | undefined>(() => getUser()?.id);
  const isGuest = userId == null;

  // Appearance state — initialised from per-user localStorage keys
  const [colorMode, setColorModeState] = useState<ColorMode>(() =>
    isGuest ? 'light' : readPref('gs_color_mode', userId, 'light')
  );
  const [accentKey, setAccentKeyState] = useState<AccentKey>(() =>
    readPref('gs_accent', userId, 'blue')
  );
  const [language, setLanguageState] = useState<AppLanguage>(() =>
    readPref('gs_language', userId, 'en')
  );
  const [systemDark, setSystemDark] = useState(prefersDark);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const isDark = isGuest ? false : colorMode === 'auto' ? systemDark : colorMode === 'dark';

  // ── Re-load prefs when the logged-in user changes (login / logout) ──────────
  const reloadPrefs = useCallback((newUserId: number | undefined) => {
    setUserId(newUserId);
    if (newUserId == null) {
      // Logged out — return to the guest light theme.
      setColorModeState('light');
    } else {
      setColorModeState(readPref('gs_color_mode', newUserId, 'light'));
      setAccentKeyState(readPref('gs_accent',     newUserId, 'blue'));
      setLanguageState(readPref('gs_language',    newUserId, 'en'));
    }
  }, []);

  // Poll for auth token changes (login / logout from any tab or component)
  useEffect(() => {
    const INTERVAL = 800; // ms
    const id = setInterval(() => {
      const newId = getUser()?.id;
      if (newId !== userId) reloadPrefs(newId);
    }, INTERVAL);
    return () => clearInterval(id);
  }, [userId, reloadPrefs]);

  // ── Apply dark class ────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    if (!isGuest) {
      localStorage.setItem(userKey('gs_color_mode', userId), colorMode);
    }
  }, [colorMode, isDark, isGuest, userId]);

  // ── Apply accent CSS variable ───────────────────────────────────────────────
  useEffect(() => {
    const color = ACCENT_MAP[accentKey];
    document.documentElement.style.setProperty('--gs-accent', color);
    if (!isGuest) {
      localStorage.setItem(userKey('gs_accent', userId), accentKey);
    }
  }, [accentKey, isGuest, userId]);

  // ── Persist language (language is allowed even for guests) ──────────────────
  useEffect(() => {
    localStorage.setItem(userKey('gs_language', userId), language);
  }, [language, userId]);

  // Setters — silently ignore if guest (UI should hide the controls anyway)
  const setColorMode = (m: ColorMode) => { if (!isGuest) setColorModeState(m); };
  const setAccentKey = (k: AccentKey) => { if (!isGuest) setAccentKeyState(k); };
  const setLanguage  = (l: AppLanguage) => setLanguageState(l); // guests CAN change language

  return (
    <AppContext.Provider value={{ colorMode, setColorMode, accentKey, setAccentKey, isDark, language, setLanguage, isGuest }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppSettings() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppSettings must be used inside <AppProvider>');
  return ctx;
}
