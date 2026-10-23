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
    '@id': `${SITE_URL}/#dealer`,
    logo: `${SITE_URL}/carson-logo.png`,
    image: `${SITE_URL}/carson-logo.png`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: '550 Windmill Rd',
      addressLocality: 'Dartmouth',
      addressRegion: 'NS',
      postalCode: 'B3B 1B3',
      addressCountry: 'CA',
    },
    // Coordinates, hours, price range and profiles as published in the
    // dealership's existing listing data on carsonexports.com (October 2026).
    geo: { '@type': 'GeoCoordinates', latitude: 44.69305, longitude: -63.59943 },
    hasMap: 'https://www.google.com/maps/search/?api=1&query=Carson+Exports+550+Windmill+Road+Dartmouth+NS',
    areaServed: [
      { '@type': 'City', name: 'Dartmouth' },
      { '@type': 'City', name: 'Halifax' },
      { '@type': 'AdministrativeArea', name: 'Halifax Regional Municipality' },
      { '@type': 'State', name: 'Nova Scotia' },
    ],
    priceRange: '$5,000 - $250,000',
    knowsLanguage: ['en-CA'],
    sameAs: [
      'https://www.facebook.com/Carsonexports/',
      'https://www.instagram.com/carsonexports/',
      'https://www.youtube.com/@Carson_exports',
    ],
    openingHoursSpecification: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Friday'], opens: '09:00', closes: '18:00' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday'], opens: '09:00', closes: '19:00' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday'], opens: '09:00', closes: '17:00' },
    ],
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
