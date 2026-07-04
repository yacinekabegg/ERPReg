import type { Metadata, Viewport } from 'next';
import './globals.css';
import RegisterSW from '@/components/RegisterSW';

export const metadata: Metadata = {
  title: 'ERP Reggenerate — Circul\'Egg',
  description: 'Gestion stock, qualité et expéditions Reggenerate®',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'ERP Reggenerate', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#1f7a5c',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
