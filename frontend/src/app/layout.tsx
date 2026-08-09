import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PermisoGT — Licencias de Construcción',
  description:
    'Sistema de expedientes digitales para licencias de construcción municipales en Guatemala',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
