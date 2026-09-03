import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { LocaleProvider } from './i18n';
import './globals.css';
import './cinematic.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Factory Maker: Live Service Studio',
  description:
    'A human-led WebMCP studio where a browser agent composes a working, verifiable multi-screen service from one thought.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'Factory Maker: Live Service Studio',
    description:
      'Turn a rough idea into a working WebMCP service while every human and agent decision stays visible.',
    type: 'website',
    images: [
      {
        url: '/factory-floor-social-preview.png',
        width: 1536,
        height: 1024,
        alt: 'A cinematic studio where a person and a browser agent compose a working WebMCP service together.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Factory Maker: Live Service Studio',
    description: 'A human-led WebMCP studio for turning rough intent into a verified, working service.',
    images: ['/factory-floor-social-preview.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
