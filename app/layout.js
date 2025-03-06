import './globals.css';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Minecraft Server Control Panel',
  description: 'Control your Minecraft server from anywhere',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="overscroll-none">
      <body className={`${inter.className} bg-[#1A1A1A] min-h-screen overscroll-none`}>
        <Header />
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
