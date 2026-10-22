import type { Metadata } from 'next';

// Personal page: keep it out of search results.
export const metadata: Metadata = {
  title: "Compare Vehicles",
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
