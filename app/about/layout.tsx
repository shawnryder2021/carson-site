import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/serverDb';

// Page metadata (the page itself is a client component and can't export it).
export const metadata: Metadata = {
  title: "About Carson Exports, Dartmouth NS",
  description: "Carson Exports is a used car dealership at 550 Windmill Road in Dartmouth, Nova Scotia, serving Halifax and all of HRM.",
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: { title: "About Carson Exports, Dartmouth NS | Carson Exports", description: "Carson Exports is a used car dealership at 550 Windmill Road in Dartmouth, Nova Scotia, serving Halifax and all of HRM.", url: `${SITE_URL}/about` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
