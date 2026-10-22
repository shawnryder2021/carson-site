import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/serverDb';
import { HomePage } from '@/components/HomePage';

// The homepage UI is a client component; this server wrapper gives it metadata.
export const metadata: Metadata = {
  title: { absolute: 'Used Cars in Dartmouth & Halifax, NS | Carson Exports' },
  description: 'Carson Exports in Dartmouth, NS: used cars, SUVs and trucks with real photos, transparent pricing, financing and trade-ins. Serving Halifax and all of HRM.',
  alternates: { canonical: `${SITE_URL}/` },
  openGraph: {
    title: 'Used Cars in Dartmouth & Halifax, NS | Carson Exports',
    description: 'Used cars, SUVs and trucks with real photos, transparent pricing, financing and trade-ins at Carson Exports in Dartmouth, NS.',
    url: `${SITE_URL}/`,
  },
};

export default function Home() {
  return <HomePage />;
}
