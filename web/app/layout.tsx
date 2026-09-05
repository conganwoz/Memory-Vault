import type { Metadata, Viewport } from 'next';
import { Playfair_Display } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Kindred — Shared Memory Vault',
  description:
    'A collaborative memory album for preserving moments together with those who matter most.',
};

export const viewport: Viewport = {
  themeColor: '#FDFBF7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={playfair.variable}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
