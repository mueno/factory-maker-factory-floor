'use client';

import { use } from 'react';
import { EarthExperience } from './earth/EarthExperience';
import { LocaleProvider, type Locale } from './i18n';

type SearchParams = Record<string, string | string[] | undefined>;

export default function Page(props: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const raw = props.searchParams;
  const resolved = raw && typeof (raw as Promise<unknown>).then === 'function'
    ? use(raw as Promise<SearchParams>)
    : raw as SearchParams | undefined;
  const lang = resolved?.lang;
  const initial: Locale | undefined = lang === 'ja' || lang === 'en' ? lang : undefined;
  return <LocaleProvider initial={initial}><EarthExperience /></LocaleProvider>;
}
