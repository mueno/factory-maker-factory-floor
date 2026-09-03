'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Locale = 'en' | 'ja';

const LOCALE_KEY = 'factory-floor-locale-v1';

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function initialBrowserLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const requested = new URLSearchParams(window.location.search).get('lang');
  if (requested === 'en' || requested === 'ja') return requested;
  const saved = window.localStorage.getItem(LOCALE_KEY);
  if (saved === 'en' || saved === 'ja') return saved;
  return window.navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

export function LocaleProvider({ children, initial }: { children: React.ReactNode; initial?: Locale }) {
  const [locale, updateLocale] = useState<Locale>(initial ?? 'en');

  useEffect(() => {
    // With an explicit initial locale (from ?lang=), SSR and hydration already
    // agree; only sync the html lang attribute. Otherwise detect client-side.
    if (initial) {
      document.documentElement.lang = initial;
      return;
    }
    const next = initialBrowserLocale();
    document.documentElement.lang = next;
    queueMicrotask(() => updateLocale(next));
  }, [initial]);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale: (next) => {
      updateLocale(next);
      window.localStorage.setItem(LOCALE_KEY, next);
      document.documentElement.lang = next;
      const url = new URL(window.location.href);
      url.searchParams.set('lang', next);
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    },
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used within LocaleProvider');
  return value;
}

export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();
  const label = locale === 'ja' ? '表示言語' : 'Display language';

  return (
    <div className={`language-switch ${compact ? 'compact' : ''}`} role="group" aria-label={label}>
      <button type="button" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>EN</button>
      <button type="button" aria-pressed={locale === 'ja'} onClick={() => setLocale('ja')}>日本語</button>
    </div>
  );
}
