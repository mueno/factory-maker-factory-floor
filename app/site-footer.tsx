'use client';

import Link from 'next/link';
import { LanguageSwitch, useLocale } from './i18n';

export function SiteFooter() {
  const { locale } = useLocale();
  const copy = locale === 'ja'
    ? {
        tag: 'AllNew合同会社によるハッカソン応募作品',
        nav: '法務・プロジェクト情報',
        terms: '利用規約',
        privacy: 'プライバシー',
        safety: 'AIと安全性',
        source: 'ソースコード ↗',
        note: '評価用ソフトウェアであり、専門的な助言ではありません。個人情報、機密情報、健康情報、決済情報を入力しないでください。',
      }
    : {
        tag: 'Hackathon entry by AllNew LLC',
        nav: 'Legal and project links',
        terms: 'Terms',
        privacy: 'Privacy',
        safety: 'AI & Safety',
        source: 'Source ↗',
        note: 'Evaluation software, not professional advice. Do not enter personal, confidential, health, or payment information.',
      };

  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <Link className="footer-brand" href="/" aria-label="Factory Maker: Factory Floor home">
          <span className="brand-mark">F</span>
          <span>
            <strong>FACTORY MAKER</strong>
            <small>{copy.tag}</small>
          </span>
        </Link>
        <div className="site-footer-right">
          <LanguageSwitch compact />
          <nav aria-label={copy.nav}>
            <Link href="/terms">{copy.terms}</Link>
            <Link href="/privacy">{copy.privacy}</Link>
            <Link href="/ai-safety">{copy.safety}</Link>
            <a href="https://github.com/mueno/factory-maker-factory-floor" target="_blank" rel="noreferrer">{copy.source}</a>
          </nav>
        </div>
      </div>
      <p>{copy.note} © 2026 AllNew LLC.</p>
    </footer>
  );
}
