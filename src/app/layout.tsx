import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Creando Oportunidades - Curso de Asistente Virtual',
  description: 'Domina la Asistencia Virtual y Multiplica tus Ingresos',
  icons: {
    icon: 'https://cdn.phototourl.com/free/2026-06-19-1b5d756a-eb26-4b1c-a3c7-107dd2ff4b86.png',
    shortcut: 'https://cdn.phototourl.com/free/2026-06-19-1b5d756a-eb26-4b1c-a3c7-107dd2ff4b86.png',
    apple: 'https://cdn.phototourl.com/free/2026-06-19-1b5d756a-eb26-4b1c-a3c7-107dd2ff4b86.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
