import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter, Fraunces, Anton } from 'next/font/google';
import { CustomerAuthProvider } from '@/context/CustomerAuthContext';
import { SavedProvider } from '@/context/SavedContext';
import { CompareProvider } from '@/context/CompareContext';
import { PriceModeProvider } from '@/context/PriceModeContext';
import { HeroConfigProvider } from '@/context/HeroConfigContext';
import { SITE_URL, fetchSettings } from '@/lib/serverDb';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { AppShell } from './AppShell';
import './globals.css';
import { jsonLdSafe } from '@/lib/escapeHtml';

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

// Google surfaces this in the knowledge panel, so a placeholder number here is
// actively harmful — the telephone key is omitted until a real one is saved.
function dealerJsonLd(phone: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'AutoDealer',
    name: 'Carson Exports',
    url: SITE_URL,
    ...(phone ? { telephone: phone } : {}),
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
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { contactPhone } = await fetchSettings();
  return (
    <html lang="en">
      <body className={`${inter.variable} ${fraunces.variable} ${anton.variable}`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(dealerJsonLd(contactPhone)) }} />
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
        <CustomerAuthProvider>
          <SavedProvider>
            <CompareProvider>
              <PriceModeProvider>
                <HeroConfigProvider>
                  <AppShell>{children}</AppShell>
                </HeroConfigProvider>
              </PriceModeProvider>
            </CompareProvider>
          </SavedProvider>
        </CustomerAuthProvider>
      </body>
    </html>
  );
}
