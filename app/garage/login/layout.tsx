import type { Metadata } from 'next';

// Personal page: keep it out of search results.
export const metadata: Metadata = {
  title: "Sign In to My Garage",
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
