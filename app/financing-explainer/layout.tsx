import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/serverDb';

// Page metadata (the page itself is a client component and can't export it).
export const metadata: Metadata = {
  title: "Car Payment Questions, Answered by AI",
  description: "Ask Carson AI how car loans, interest, terms and down payments work, and what fits your budget, before you visit our Dartmouth dealership.",
  alternates: { canonical: `${SITE_URL}/financing-explainer` },
  openGraph: { title: "Car Payment Questions, Answered by AI | Carson Exports", description: "Ask Carson AI how car loans, interest, terms and down payments work, and what fits your budget, before you visit our Dartmouth dealership.", url: `${SITE_URL}/financing-explainer` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
