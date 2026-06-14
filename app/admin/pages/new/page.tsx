'use client';

import { PageEditor } from '@/components/admin/PageEditor';

export default function NewPage() {
  return <PageEditor isNew initial={{ slug: '', title: '', description: '', blocks: [{ type: 'html', html: '' }], published: true }} />;
}
