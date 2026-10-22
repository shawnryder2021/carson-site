import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/serverDb';

// Page metadata (the page itself is a client component and can't export it).
export const metadata: Metadata = {
  title: "Used Car Buying FAQ",
  description: "Answers to common questions about buying, financing, trading in and getting a used vehicle delivered from Carson Exports in Dartmouth, NS.",
  alternates: { canonical: `${SITE_URL}/faq` },
  openGraph: { title: "Used Car Buying FAQ | Carson Exports", description: "Answers to common questions about buying, financing, trading in and getting a used vehicle delivered from Carson Exports in Dartmouth, NS.", url: `${SITE_URL}/faq` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
