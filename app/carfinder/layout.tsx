import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/serverDb';

// Page metadata (the page itself is a client component and can't export it).
export const metadata: Metadata = {
  title: "CarFinder: Get Alerted When It Arrives",
  description: "Tell us the used car, SUV or truck you want and we’ll alert you the moment a match arrives at Carson Exports in Dartmouth, NS.",
  alternates: { canonical: `${SITE_URL}/carfinder` },
  openGraph: { title: "CarFinder: Get Alerted When It Arrives | Carson Exports", description: "Tell us the used car, SUV or truck you want and we’ll alert you the moment a match arrives at Carson Exports in Dartmouth, NS.", url: `${SITE_URL}/carfinder` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
