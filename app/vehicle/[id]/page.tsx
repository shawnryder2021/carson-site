import type { Metadata } from 'next';
import VehicleClient from './VehicleClient';
import { fetchVehicle, fetchVehicles, SITE_URL } from '@/lib/serverDb';
import { displayTrim } from '@/lib/sm360';
import { jsonLdSafe } from '@/lib/escapeHtml';
import { similarToVehicle } from '@/lib/recommend';
import type { AdminVehicle } from '@/lib/db';

// Server wrapper: per-vehicle metadata + structured data for SEO.
// All interactivity lives in VehicleClient.

// First sentence of a description, capped for meta descriptions.
const firstSentence = (t: string) => {
  const s = (t.match(/^[^.!?]+[.!?]/)?.[0] || '').trim();
  return s.length <= 150 ? s : s.slice(0, 147).replace(/\s+\S*$/, '') + '…';
};

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const v = await fetchVehicle(params.id);
  if (!v) {
    return { title: 'Vehicle not found', robots: { index: false } };
  }
  const name = [v.year, v.make, v.model, displayTrim(v.trim)].filter(Boolean).join(' ');
  const sold = v.status === 'sold';
  // Sold pages stay indexed (they hold long-tail search value) but the copy
  // must be honest — no price pitch on a car nobody can buy.
  const title = sold ? `SOLD — ${name}` : `${name} — $${v.price.toLocaleString()}`;
  const description = sold
    ? `This ${name} has sold. See similar ${v.body || 'vehicles'} available now at Carson Exports in Dartmouth, NS — or get alerted the moment a comparable one arrives.`
    : `${firstSentence(v.carsonTake || '') || (v.aiSummary ? v.aiSummary.slice(0, 120) + '.' : '')} ${v.mileage.toLocaleString()} km · ${v.fuel} · ${v.drive}. ` +
      `Inspected before sale at Carson Exports, Dartmouth NS.`;
  const image = v.images[0] || `${SITE_URL}/carson-logo.png`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/vehicle/${v.id}` },
    openGraph: {
      title: `${title} | Carson Exports`,
      description,
      url: `${SITE_URL}/vehicle/${v.id}`,
      type: 'website',
      images: [{ url: image }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function VehiclePage({ params }: { params: { id: string } }) {
  const [v, all] = await Promise.all([fetchVehicle(params.id), fetchVehicles()]);

  // Render the "similar vehicles" rail server-side so crawlers see the internal
  // links — that's the whole SEO value of keeping sold pages alive.
  const ssrSimilar = v
    ? similarToVehicle(v as unknown as AdminVehicle, all as unknown as AdminVehicle[])
    : [];

  // Vehicle listing structured data (Car + Product, as Google's vehicle listings expect).
  const photos = (v?.images || []).filter((i: any) => typeof i === 'string') as string[];
  const trim = v ? displayTrim(v.trim) : '';
  const jsonLd = v ? {
    '@context': 'https://schema.org',
    '@type': ['Car', 'Product'],
    name: [v.year, v.make, v.model, trim].filter(Boolean).join(' '),
    description: (v.carsonTake || v.aiSummary || '').slice(0, 500) || undefined,
    brand: { '@type': 'Brand', name: v.make },
    model: v.model,
    vehicleConfiguration: trim || undefined,
    vehicleModelDate: String(v.year),
    itemCondition: 'https://schema.org/UsedCondition',
    bodyType: v.body,
    fuelType: v.fuel,
    driveWheelConfiguration: v.drive,
    vehicleTransmission: v.transmission || undefined,
    color: v.exterior || undefined,
    vehicleInteriorColor: v.interior || undefined,
    vehicleIdentificationNumber: v.vin || undefined,
    sku: v.stockNo || undefined,
    image: photos.length ? photos.slice(0, 10) : undefined,
    mileageFromOdometer: { '@type': 'QuantitativeValue', value: v.mileage, unitCode: 'KMT' },
    offers: {
      '@type': 'Offer',
      price: v.price,
      priceCurrency: 'CAD',
      itemCondition: 'https://schema.org/UsedCondition',
      availability: v.status === 'sold' ? 'https://schema.org/SoldOut'
        : v.onHold ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock',
      url: `${SITE_URL}/vehicle/${v.id}`,
      seller: {
        '@type': 'AutoDealer',
        name: 'Carson Exports',
        address: { '@type': 'PostalAddress', streetAddress: '550 Windmill Road', addressLocality: 'Dartmouth', addressRegion: 'NS', postalCode: 'B3B 1B3', addressCountry: 'CA' },
      },
    },
  } : null;

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }} />
      )}
      <VehicleClient
        params={params}
        ssrSimilar={ssrSimilar}
        initialVehicle={v ? (v as unknown as AdminVehicle) : undefined}
      />
    </>
  );
}
