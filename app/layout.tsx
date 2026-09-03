import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
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
        alt: 'Factory Maker Factory Floor, where a human and an agent build and verify a WebMCP app together.',
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
        {children}
      </body>
    </html>
  );
}
