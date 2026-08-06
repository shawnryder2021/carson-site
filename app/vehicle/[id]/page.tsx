import type { Metadata } from 'next';
import VehicleClient from './VehicleClient';
import { fetchVehicle, fetchVehicles, SITE_URL } from '@/lib/serverDb';
import { jsonLdSafe } from '@/lib/escapeHtml';
import { similarToVehicle } from '@/lib/recommend';
import type { AdminVehicle } from '@/lib/db';

// Server wrapper: per-vehicle metadata + structured data for SEO.
// All interactivity lives in VehicleClient.

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const v = await fetchVehicle(params.id);
  if (!v) {
    return { title: 'Vehicle not found', robots: { index: false } };
  }
  const name = `${v.year} ${v.make} ${v.model}`;
  const sold = v.status === 'sold';
  // Sold pages stay indexed (they hold long-tail search value) but the copy
  // must be honest — no price pitch on a car nobody can buy.
  const title = sold ? `SOLD — ${name}` : `${name} — $${v.price.toLocaleString()}`;
  const description = sold
    ? `This ${name} has sold. See similar ${v.body || 'vehicles'} available now at Carson Exports in Dartmouth, NS — or get alerted the moment a comparable one arrives.`
    : `${v.aiSummary ? v.aiSummary.slice(0, 120) + '. ' : ''}${v.mileage.toLocaleString()} km · ${v.fuel} · ${v.drive}. ` +
      `142-point inspected with a 7-day return at Carson Exports, Dartmouth NS.`;
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

  const jsonLd = v ? {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: `${v.year} ${v.make} ${v.model}`,
    brand: { '@type': 'Brand', name: v.make },
    model: v.model,
    vehicleModelDate: String(v.year),
    bodyType: v.body,
    fuelType: v.fuel,
    driveWheelConfiguration: v.drive,
    color: v.exterior || undefined,
    image: v.images[0] || undefined,
    mileageFromOdometer: { '@type': 'QuantitativeValue', value: v.mileage, unitCode: 'KMT' },
    offers: {
      '@type': 'Offer',
      price: v.price,
      priceCurrency: 'CAD',
      availability: v.status === 'sold' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
      url: `${SITE_URL}/vehicle/${v.id}`,
      seller: { '@type': 'AutoDealer', name: 'Carson Exports' },
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
