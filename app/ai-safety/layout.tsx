import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI & Safety Notice | Factory Maker',
  description: 'A plain-language explanation of Factory Maker’s WebMCP, human-control, and data boundaries.',
};

export default function AiSafetyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
