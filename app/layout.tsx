import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { LocaleProvider } from './i18n';
import './globals.css';
import './pixel.css';
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
  title: 'Factory Maker: 16-bit Service Workshop',
  description:
    'A human-led WebMCP workshop where an AI crew turns a rough idea into a working, verifiable service.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'Factory Maker: 16-bit Service Workshop',
    description:
      'Cast a rough idea into a working WebMCP service while every human and agent decision stays visible.',
    type: 'website',
    images: [
      {
        url: '/factory-floor-social-preview.png',
        width: 1536,
        height: 1024,
        alt: 'A pixel-art fantasy workshop where a human mage, a fairy, and a dwarf build a WebMCP service together.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Factory Maker: 16-bit Service Workshop',
    description: 'A human-led WebMCP workshop for turning rough intent into a verified, working service.',
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
