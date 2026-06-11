'use client';

import { useEffect, useState } from 'react';
import { GuideForm } from '@/components/admin/GuideForm';
import { getGuideBySlug, AdminGuide } from '@/lib/db';

export default function EditGuidePage({ params }: { params: { slug: string } }) {
  const [guide, setGuide] = useState<AdminGuide | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => { setGuide(await getGuideBySlug(params.slug)); setLoading(false); })();
  }, [params.slug]);

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading…</div>;
  if (!guide) return <div style={{ padding: 40 }}>Guide not found.</div>;
  return <GuideForm initial={guide} isNew={false} />;
}
