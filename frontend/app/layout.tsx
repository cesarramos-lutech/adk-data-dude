import type { Metadata } from 'next';
import './globals.css';
import { GlobalToast } from '@/src/components/GlobalToast';

export const metadata: Metadata = {
  title: 'Enterprise Data Copilot',
  description: 'Generative BI — ask questions, view insights.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[var(--chat-bg)] text-[var(--text)] antialiased">
        {children}
        <GlobalToast />
      </body>
    </html>
  );
}
