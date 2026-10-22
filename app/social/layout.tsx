import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/serverDb';

// Page metadata (the page itself is a client component and can't export it).
export const metadata: Metadata = {
  title: "Social: Latest Arrivals & Deliveries",
  description: "The latest arrivals, deliveries and behind-the-scenes from Carson Exports in Dartmouth, NS, from our social channels.",
  alternates: { canonical: `${SITE_URL}/social` },
  openGraph: { title: "Social: Latest Arrivals & Deliveries | Carson Exports", description: "The latest arrivals, deliveries and behind-the-scenes from Carson Exports in Dartmouth, NS, from our social channels.", url: `${SITE_URL}/social` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
