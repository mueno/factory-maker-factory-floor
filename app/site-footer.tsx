import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <Link className="footer-brand" href="/" aria-label="Factory Maker: Factory Floor home">
          <span className="brand-mark">F</span>
          <span>
            <strong>FACTORY MAKER</strong>
            <small>Hackathon prototype by AllNew LLC</small>
          </span>
        </Link>
        <nav aria-label="Legal and project links">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/ai-safety">AI &amp; Safety</Link>
          <a href="https://github.com/mueno/factory-maker-factory-floor" target="_blank" rel="noreferrer">Source ↗</a>
        </nav>
      </div>
      <p>
        Evaluation software, not professional advice. Do not enter personal, confidential,
        health, or payment information. © 2026 AllNew LLC.
      </p>
    </footer>
  );
}
