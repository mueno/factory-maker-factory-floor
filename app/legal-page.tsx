import type { ReactNode } from 'react';
import Link from 'next/link';
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
        <Link className="legal-back" href="/">← Back to Factory Floor</Link>
      </header>
      <article className="legal-document">
        <header className="legal-heading">
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          <p className="legal-summary">{summary}</p>
          <div className="legal-meta">
            <span>Effective September 3, 2026</span>
            <span>Operator: AllNew LLC · Japan</span>
          </div>
        </header>
        <div className="legal-body">{children}</div>
      </article>
      <SiteFooter />
    </main>
  );
}
