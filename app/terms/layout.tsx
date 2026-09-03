import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use | Factory Maker',
  description: 'Terms governing use of the Factory Maker WebMCP hackathon prototype.',
};

export default function TermsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
