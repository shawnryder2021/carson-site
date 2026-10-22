import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/serverDb';

// Page metadata (the page itself is a client component and can't export it).
export const metadata: Metadata = {
  title: "Used Cars for Sale in Dartmouth & Halifax",
  description: "Browse used cars, SUVs and trucks for sale at Carson Exports in Dartmouth, NS: real photos, transparent prices, financing and trade-ins. Updated daily.",
  alternates: { canonical: `${SITE_URL}/inventory` },
  openGraph: { title: "Used Cars for Sale in Dartmouth & Halifax | Carson Exports", description: "Browse used cars, SUVs and trucks for sale at Carson Exports in Dartmouth, NS: real photos, transparent prices, financing and trade-ins. Updated daily.", url: `${SITE_URL}/inventory` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
