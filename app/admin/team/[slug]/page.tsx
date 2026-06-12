'use client';

import { useEffect, useState } from 'react';
import { TeamForm } from '@/components/admin/TeamForm';
import { getTeamMemberBySlug, TeamMember } from '@/lib/db';

export default function EditTeamMemberPage({ params }: { params: { slug: string } }) {
  const [member, setMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTeamMemberBySlug(params.slug).then(m => { setMember(m); setLoading(false); });
  }, [params.slug]);

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading…</div>;
  if (!member) return <div style={{ padding: 40 }}>Team member not found.</div>;
  return <TeamForm initial={member} isNew={false} />;
}
