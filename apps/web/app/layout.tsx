import { Inter, Roboto_Mono } from 'next/font/google';
import './globals.css';

// Configuramos las fuentes
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const robotoMono = Roboto_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = { title: 'Kenzly Industrial' };
export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${robotoMono.variable}`}>
      <body style={{
        margin: 0,
        fontFamily: 'var(--font-inter), sans-serif',
        WebkitFontSmoothing: 'antialiased',
        minHeight: '100vh',
        backgroundAttachment: 'fixed',
        background: [
          'radial-gradient(ellipse at 8% 8%,   #3a9ab8 0%, transparent 50%)',
          'radial-gradient(ellipse at 85% 15%,  #4e7a58 0%, transparent 50%)',
          'radial-gradient(ellipse at 55% 50%,  #1e4d3a 0%, transparent 55%)',
          'radial-gradient(ellipse at 8% 90%,   #c2b49a 0%, transparent 42%)',
          'radial-gradient(ellipse at 75% 88%,  #0c1a10 0%, transparent 50%)',
          '#152a1e',
        ].join(', '),
      }}>
        {children}
      </body>
    </html>
  );
}