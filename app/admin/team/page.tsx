'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { TeamAvatar } from '@/components/TeamAvatar';
import { listTeam, deleteTeamMember, saveTeamMember, reorderTeam, isSupabaseConfigured, TeamMember } from '@/lib/db';

export default function AdminTeam() {
  const router = useRouter();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setTeam(await listTeam({ includeInactive: true }));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= team.length) return;
    const copy = [...team];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setTeam(copy);
    setBusy(true);
    await reorderTeam(copy.map(m => m.slug));
    setBusy(false);
  };

  const toggleActive = async (m: TeamMember) => {
    setBusy(true);
    const { error } = await saveTeamMember({ ...m, active: !m.active });
    setBusy(false);
    if (error) return alert(error);
    load();
  };

  const remove = async (m: TeamMember) => {
    if (!confirm(`Remove ${m.name} from the team page?`)) return;
    setBusy(true);
    const { error } = await deleteTeamMember(m.slug);
    setBusy(false);
    if (error) return alert(error);
    load();
  };

  return (
    <div style={{ padding: '32px 40px 60px', maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: 0 }}>Team</h1>
        <button onClick={() => router.push('/admin/team/new')} className="btn btn-primary btn-sm">
          <Icon name="sparkles" size={14} /> Add team member
        </button>
      </div>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px' }}>
        Each member gets their own page at /team/their-name with photo, video, bio, and fun facts.
      </p>

      {!isSupabaseConfigured && (
        <div style={{ background: '#FFF4E5', color: '#8A5400', borderRadius: 12, padding: '14px 16px', fontSize: 14, marginBottom: 20 }}>
          Connect Supabase to manage the team.
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>
      ) : team.length === 0 ? (
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          No team members yet. Add your first one — it takes a minute.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {team.map((m, i) => (
            <div key={m.slug} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, opacity: m.active ? 1 : 0.55 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <button onClick={() => move(i, -1)} disabled={busy || i === 0} className="icon-btn" style={{ opacity: i === 0 ? 0.3 : 1 }}><Icon name="chevronUp" size={15} /></button>
                <button onClick={() => move(i, 1)} disabled={busy || i === team.length - 1} className="icon-btn" style={{ opacity: i === team.length - 1 ? 0.3 : 1 }}><Icon name="chevronDown" size={15} /></button>
              </div>
              <TeamAvatar name={m.name} photoUrl={m.photoUrl} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{m.name} {!m.active && <span style={{ fontSize: 11, fontWeight: 700, color: '#8A8A8A', marginLeft: 6 }}>HIDDEN</span>}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{m.role}{m.videoUrl ? ' · has video' : ''} · /team/{m.slug}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, whiteSpace: 'nowrap' }}>
                <button onClick={() => toggleActive(m)} disabled={busy} className="btn btn-ghost btn-sm">{m.active ? 'Hide' : 'Show'}</button>
                <button onClick={() => router.push(`/admin/team/${m.slug}`)} className="btn btn-ghost btn-sm">Edit</button>
                <button onClick={() => remove(m)} disabled={busy} className="btn btn-ghost btn-sm" style={{ color: '#A8232C' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
