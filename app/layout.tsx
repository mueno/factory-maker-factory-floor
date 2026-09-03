import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { LocaleProvider } from './i18n';
import './globals.css';
import './cinematic.css';
import './earth/earth.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TERRA — Voice-Driven Earth Engine',
  description:
    'Speak to a living 3D Earth. People and browser agents explore assessed climate evidence through the same camera, layers, scenarios, and timeline.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'TERRA — Voice-Driven Earth Engine',
    description:
      'A WebMCP-native scientific stage where evidence moves as you speak.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'TERRA — Voice-Driven Earth Engine',
    description: 'A WebMCP-native scientific stage where evidence moves as you speak.',
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
