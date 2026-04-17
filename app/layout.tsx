import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Shaoqi Chen — Data Engineer',
  description: 'Data Platform · DevOps · AI Engineering',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
