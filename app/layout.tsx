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
  title: 'Adlib — Improvised UI Runtime',
  description:
    'Say what you need and an app appears. Every next screen is improvised at runtime by a brain — your WebMCP browser agent or an API. No app code is written in advance.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'Adlib — Improvised UI Runtime',
    description:
      'Apps are born at runtime: a WebMCP-native stage where the UI is improvised on every interaction.',
    type: 'website',
    images: [
      {
        url: '/factory-floor-social-preview.png',
        width: 1536,
        height: 1024,
        alt: 'Adlib: a live stage where a brain improvises the user interface at runtime.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Adlib — Improvised UI Runtime',
    description: 'A WebMCP-native stage where every next screen is improvised at runtime.',
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
