import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Factory Maker',
  description: 'How Factory Maker handles local workflow data and hosting information.',
};

export default function PrivacyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
