import type { Metadata } from 'next';
import VehicleClient from './VehicleClient';
import { fetchVehicle, SITE_URL } from '@/lib/serverDb';

// Server wrapper: per-vehicle metadata + structured data for SEO.
// All interactivity lives in VehicleClient.

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const v = await fetchVehicle(params.id);
  if (!v) {
    return { title: 'Vehicle not found', robots: { index: false } };
  }
  const name = `${v.year} ${v.make} ${v.model}`;
  const title = `${name} — $${v.price.toLocaleString()}`;
  const description =
    `${v.aiSummary ? v.aiSummary.slice(0, 120) + '. ' : ''}${v.mileage.toLocaleString()} km · ${v.fuel} · ${v.drive}. ` +
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
  const v = await fetchVehicle(params.id);

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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      <VehicleClient params={params} />
    </>
  );
}
