'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageEditor } from '@/components/admin/PageEditor';
import { getPageBySlug, CustomPage } from '@/lib/db';

export default function EditPage() {
  const params = useParams();
  const slug = String(params.slug);
  const [page, setPage] = useState<CustomPage | null | undefined>(undefined);

  useEffect(() => { getPageBySlug(slug).then(setPage); }, [slug]);

  if (page === undefined) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading…</div>;
  if (!page) return <div style={{ padding: 40, color: 'var(--muted)' }}>Page not found.</div>;
  return <PageEditor isNew={false} initial={page} />;
}
