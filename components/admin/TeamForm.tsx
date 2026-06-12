'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { TeamAvatar } from '@/components/TeamAvatar';
import { youTubeId } from '@/data/heroConfig';
import { saveTeamMember, uploadImage, isSupabaseConfigured, TeamMember } from '@/lib/db';

const EMPTY: TeamMember = {
  slug: '', name: '', role: 'Sales Specialist', photoUrl: '', videoUrl: '',
  bio: '', funFacts: [''], specialties: [], email: '', phone: '', active: true,
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

export function TeamForm({ initial, isNew }: { initial?: TeamMember; isNew: boolean }) {
  const router = useRouter();
  const [m, setM] = useState<TeamMember>(initial || EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<TeamMember>) => setM(prev => ({ ...prev, ...patch }));

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const videoOk = !m.videoUrl || !!youTubeId(m.videoUrl);

  const submit = async () => {
    setError(null);
    if (!m.name) { setError('Name is required.'); return; }
    if (!videoOk) { setError('The video must be a valid YouTube link.'); return; }
    const slug = m.slug || slugify(m.name);
    setSaving(true);
    const { error } = await saveTeamMember({ ...m, slug, funFacts: m.funFacts.filter(f => f.trim()), specialties: m.specialties.filter(s => s.trim()) });
    setSaving(false);
    if (error) { setError(error); return; }
    router.push('/admin/team');
    router.refresh();
  };

  return (
    <div style={{ padding: '32px 40px 60px', maxWidth: 720 }}>
      <button onClick={() => router.push('/admin/team')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, marginBottom: 16 }}>← Back to team</button>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 24px' }}>
        {isNew ? 'Add team member' : `Edit ${m.name}`}
      </h1>

      <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '26px 28px' }}>
        {/* Photo */}
        <Field label="Photo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <TeamAvatar name={m.name || '?'} photoUrl={m.photoUrl} size={84} />
            <div>
              <input
                ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={async e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setUploading(true);
                  const { url, error } = await uploadImage(f);
                  setUploading(false);
                  if (error) { setError(error); return; }
                  if (url) set({ photoUrl: url });
                  if (fileRef.current) fileRef.current.value = '';
                }}
              />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading || !isSupabaseConfigured} className="btn btn-ghost btn-sm">
                {uploading ? 'Uploading…' : 'Upload photo'}
              </button>
              {m.photoUrl && (
                <button type="button" onClick={() => set({ photoUrl: '' })} className="btn btn-ghost btn-sm" style={{ color: '#A8232C', marginLeft: 8 }}>Remove</button>
              )}
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Square headshots look best.</div>
            </div>
          </div>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Name"><input className="input" value={m.name} onChange={e => set({ name: e.target.value })} placeholder="Jordan Smith" /></Field>
          <Field label="Role"><input className="input" value={m.role} onChange={e => set({ role: e.target.value })} placeholder="Sales Specialist" /></Field>
        </div>

        <Field label="Intro video (YouTube, optional)" hint={m.videoUrl ? (videoOk ? '✓ Valid YouTube link' : '⚠ Not a valid YouTube link') : 'A 60-second “hi, I’m…” video makes profiles way more personal.'}>
          <input className="input" value={m.videoUrl} onChange={e => set({ videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" style={{ borderColor: videoOk ? undefined : '#A8232C' }} />
        </Field>

        <Field label="Bio">
          <textarea className="input" value={m.bio} onChange={e => set({ bio: e.target.value })} placeholder="A few sentences about them — how long they've been with Carson, what they love about the job…" style={{ minHeight: 100, fontFamily: 'inherit', resize: 'vertical' }} />
        </Field>

        <Field label="Fun facts">
          {m.funFacts.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input className="input" value={f} onChange={e => set({ funFacts: m.funFacts.map((x, j) => j === i ? e.target.value : x) })} placeholder="e.g., Has owned 14 cars — and remembers every one" />
              <button type="button" onClick={() => set({ funFacts: m.funFacts.filter((_, j) => j !== i) })} className="btn btn-ghost btn-sm" style={{ color: '#A8232C' }}>×</button>
            </div>
          ))}
          <button type="button" onClick={() => set({ funFacts: [...m.funFacts, ''] })} className="btn btn-ghost btn-sm">+ Add fun fact</button>
        </Field>

        <Field label="Specialties (comma-separated)" hint="Shown as badges, e.g. Trucks & towing, First-time buyers, EVs">
          <input
            className="input"
            value={m.specialties.join(', ')}
            onChange={e => set({ specialties: e.target.value.split(',').map(s => s.trim()) })}
            placeholder="Trucks & towing, First-time buyers"
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Direct phone (optional)"><input className="input" value={m.phone} onChange={e => set({ phone: e.target.value })} placeholder="(902) 555-0123" /></Field>
          <Field label="Email (optional)"><input className="input" value={m.email} onChange={e => set({ email: e.target.value })} placeholder="jordan@carsonexports.com" /></Field>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 4 }}>
          <input type="checkbox" checked={m.active} onChange={e => set({ active: e.target.checked })} style={{ accentColor: 'var(--teal)' }} />
          Visible on the team page
        </label>

        {error && <div style={{ background: '#FDECEE', color: '#A8232C', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginTop: 14 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={submit} disabled={saving} className="btn btn-primary">
            {saving ? 'Saving…' : <><Icon name="check" size={14} /> {isNew ? 'Add member' : 'Save changes'}</>}
          </button>
          <button onClick={() => router.push('/admin/team')} className="btn btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  );
}
