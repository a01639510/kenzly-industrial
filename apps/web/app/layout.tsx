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
        fontFamily: 'var(--font-inter), sans-serif', // Fuente limpia para todo
        WebkitFontSmoothing: 'antialiased' 
      }}>
        {children}
      </body>
    </html>
  );
}