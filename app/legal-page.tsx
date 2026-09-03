'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { LanguageSwitch, useLocale } from './i18n';
import { SiteFooter } from './site-footer';

export function LegalPage({
  eyebrow,
  title,
  summary,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  const { locale } = useLocale();
  return (
    <main className="legal-shell">
      <header className="legal-topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">F</span>
          <span>
            <b>FACTORY MAKER</b>
            <small>Browser-native build system</small>
          </span>
        </Link>
        <div className="legal-topbar-actions">
          <LanguageSwitch compact />
          <Link className="legal-back" href="/">← {locale === 'ja' ? 'Factory Makerに戻る' : 'Back to Factory Maker'}</Link>
        </div>
      </header>
      <article className="legal-document">
        <header className="legal-heading">
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          <p className="legal-summary">{summary}</p>
          <div className="legal-meta">
            <span>{locale === 'ja' ? '施行日：2026年9月3日' : 'Effective September 3, 2026'}</span>
            <span>{locale === 'ja' ? '運営者：AllNew合同会社（日本）' : 'Operator: AllNew LLC · Japan'}</span>
          </div>
        </header>
        <div className="legal-body">{children}</div>
      </article>
      <SiteFooter />
    </main>
  );
}
