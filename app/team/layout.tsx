import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/serverDb';

// Page metadata (the page itself is a client component and can't export it).
export const metadata: Metadata = {
  title: "Meet the Team",
  description: "Meet the people at Carson Exports in Dartmouth, NS who help Halifax-area drivers find, finance and service their next used vehicle.",
  alternates: { canonical: `${SITE_URL}/team` },
  openGraph: { title: "Meet the Team | Carson Exports", description: "Meet the people at Carson Exports in Dartmouth, NS who help Halifax-area drivers find, finance and service their next used vehicle.", url: `${SITE_URL}/team` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
