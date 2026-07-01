import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter, Fraunces, Anton } from 'next/font/google';
import { SavedProvider } from '@/context/SavedContext';
import { PriceModeProvider } from '@/context/PriceModeContext';
import { HeroConfigProvider } from '@/context/HeroConfigContext';
import { SITE_URL } from '@/lib/serverDb';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { AppShell } from './AppShell';
import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'] });
// Anton: a free, near-identical match for the dealership's Impact font, used
// as the fallback so devices without Impact (most phones) still get the look.
const anton = Anton({ variable: '--font-anton', weight: '400', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Carson Exports — The best place to buy a used car. Period.',
    template: '%s | Carson Exports',
  },
  description: 'Family-run auto sales in Dartmouth, NS. AI-powered car finder, honest pricing, 142-point inspections, and zero pressure.',
  openGraph: {
    siteName: 'Carson Exports',
    type: 'website',
    url: SITE_URL,
    images: [{ url: `${SITE_URL}/carson-logo.png` }],
  },
};

const dealerJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AutoDealer',
  name: 'Carson Exports',
  url: SITE_URL,
  telephone: '(555) 234-9090',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '550 Windmill Rd',
    addressLocality: 'Dartmouth',
    addressRegion: 'NS',
    postalCode: 'B3B 1B3',
    addressCountry: 'CA',
  },
  openingHours: ['Mo-Fr 09:00-19:00', 'Sa 10:00-18:00', 'Su 11:00-17:00'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${fraunces.variable} ${anton.variable}`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dealerJsonLd) }} />
        {/* Web analytics (shawnryder.site, site #56) — collects the data the
            admin Traffic dashboard reads. */}
        <Script
          id="ZwSg9rf6GA"
          src="https://shawnryder.site/js/script.js"
          data-host="https://shawnryder.site"
          data-dnt="false"
          strategy="afterInteractive"
        />
        <GoogleAnalytics />
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
