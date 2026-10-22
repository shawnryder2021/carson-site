import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/serverDb';

// Page metadata (the page itself is a client component and can't export it).
export const metadata: Metadata = {
  title: "Contact Us: 550 Windmill Rd, Dartmouth",
  description: "Call, email or visit Carson Exports at 550 Windmill Road, Dartmouth, NS. Get directions, hours and answers about any vehicle in stock.",
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: { title: "Contact Us: 550 Windmill Rd, Dartmouth | Carson Exports", description: "Call, email or visit Carson Exports at 550 Windmill Road, Dartmouth, NS. Get directions, hours and answers about any vehicle in stock.", url: `${SITE_URL}/contact` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
