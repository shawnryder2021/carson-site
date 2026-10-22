import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/serverDb';

// Page metadata (the page itself is a client component and can't export it).
export const metadata: Metadata = {
  title: "Customer Reviews",
  description: "Read what customers say about buying a used vehicle from Carson Exports in Dartmouth, Nova Scotia.",
  alternates: { canonical: `${SITE_URL}/testimonials` },
  openGraph: { title: "Customer Reviews | Carson Exports", description: "Read what customers say about buying a used vehicle from Carson Exports in Dartmouth, Nova Scotia.", url: `${SITE_URL}/testimonials` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
