import type { Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import { SavedProvider } from '@/context/SavedContext';
import { PriceModeProvider } from '@/context/PriceModeContext';
import { HeroConfigProvider } from '@/context/HeroConfigContext';
import { AppShell } from './AppShell';
import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Carson Exports — The best place to buy a used car. Period.',
  description: 'Family-run worldwide auto sales since 2008. AI-powered car finder, honest pricing, and zero pressure.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${fraunces.variable}`}>
        <SavedProvider>
          <PriceModeProvider>
            <HeroConfigProvider>
              <AppShell>{children}</AppShell>
            </HeroConfigProvider>
          </PriceModeProvider>
        </SavedProvider>
      </body>
    </html>
  );
}
