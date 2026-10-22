import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/serverDb';

// Page metadata (the page itself is a client component and can't export it).
export const metadata: Metadata = {
  title: "Trade-In Value Estimate in Nova Scotia",
  description: "Get an instant online estimate for your trade-in and apply it to your next used vehicle at Carson Exports in Dartmouth, NS. No email required.",
  alternates: { canonical: `${SITE_URL}/tradein` },
  openGraph: { title: "Trade-In Value Estimate in Nova Scotia | Carson Exports", description: "Get an instant online estimate for your trade-in and apply it to your next used vehicle at Carson Exports in Dartmouth, NS. No email required.", url: `${SITE_URL}/tradein` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
