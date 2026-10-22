import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/serverDb';

// Page metadata (the page itself is a client component and can't export it).
export const metadata: Metadata = {
  title: "AI Car Finder: Find Your Next Used Car",
  description: "Answer six quick questions and Carson AI matches you to used cars, SUVs and trucks in stock at our Dartmouth, NS lot, with honest pros and cons.",
  alternates: { canonical: `${SITE_URL}/finder` },
  openGraph: { title: "AI Car Finder: Find Your Next Used Car | Carson Exports", description: "Answer six quick questions and Carson AI matches you to used cars, SUVs and trucks in stock at our Dartmouth, NS lot, with honest pros and cons.", url: `${SITE_URL}/finder` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
