import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/serverDb';

// Page metadata (the page itself is a client component and can't export it).
export const metadata: Metadata = {
  title: "Used Car Financing in Nova Scotia",
  description: "Estimate monthly payments on any used vehicle and get pre-qualified online at Carson Exports in Dartmouth, Nova Scotia.",
  alternates: { canonical: `${SITE_URL}/finance` },
  openGraph: { title: "Used Car Financing in Nova Scotia | Carson Exports", description: "Estimate monthly payments on any used vehicle and get pre-qualified online at Carson Exports in Dartmouth, Nova Scotia.", url: `${SITE_URL}/finance` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
