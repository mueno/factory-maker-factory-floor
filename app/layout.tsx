import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { LocaleProvider } from './i18n';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Factory Maker: Factory Floor',
  description:
    'A shared WebMCP workbench that turns a fuzzy brief into a verified application.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'Factory Maker: Factory Floor',
    description:
      'From a fuzzy brief to a verified WebMCP app, with every human and agent decision visible.',
    type: 'website',
    images: [
      {
        url: '/factory-floor-social-preview.png',
        width: 1536,
        height: 1024,
        alt: 'A playful Factory Maker workshop where a person and a friendly AI robot build a service together.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Factory Maker: Factory Floor',
    description: 'A shared WebMCP workbench for turning fuzzy intent into a verified app.',
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
