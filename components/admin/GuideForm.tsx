'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { saveGuide, AdminGuide } from '@/lib/db';

const CATEGORIES = ['Buying', 'Financing', 'Ownership', 'Trade-in', 'EV & Hybrid'];

const EMPTY: AdminGuide = {
  slug: '', title: '', category: 'Buying', excerpt: '', readMins: 4,
  body: [{ heading: '', text: '' }], matchQuery: '', published: true,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 16 }}><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>{children}</div>;
}

export function GuideForm({ initial, isNew }: { initial?: AdminGuide; isNew: boolean }) {
  const router = useRouter();
  const [g, setG] = useState<AdminGuide>(initial || EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<AdminGuide>) => setG(prev => ({ ...prev, ...patch }));

  const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const submit = async () => {
    setError(null);
    const slug = g.slug || slugify(g.title);
    if (!g.title) { setError('Title is required.'); return; }
    setSaving(true);
    const { error } = await saveGuide({ ...g, slug });
    setSaving(false);
    if (error) { setError(error); return; }
    router.push('/admin/guides'); router.refresh();
  };

  const updateSection = (i: number, patch: Partial<{ heading: string; text: string }>) => {
    const body = [...g.body]; body[i] = { ...body[i], ...patch }; set({ body });
  };

  return (
    <div style={{ padding: '32px 40px 60px', maxWidth: 800 }}>
      <button onClick={() => router.push('/admin/guides')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, marginBottom: 16 }}>← Back to guides</button>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 24px' }}>{isNew ? 'New guide' : 'Edit guide'}</h1>

      <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '26px 28px' }}>
        <Field label="Title"><input className="input" value={g.title} onChange={e => set({ title: e.target.value, slug: isNew && !g.slug ? '' : g.slug })} placeholder="The best used SUVs under $30,000" /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Category">
            <select className="select" value={g.category} onChange={e => set({ category: e.target.value as any })}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
          </Field>
          <Field label="Read time (mins)"><input className="input" type="number" value={g.readMins} onChange={e => set({ readMins: +e.target.value })} /></Field>
        </div>
        <Field label="Excerpt"><textarea className="input" value={g.excerpt} onChange={e => set({ excerpt: e.target.value })} style={{ minHeight: 64, fontFamily: 'inherit', resize: 'vertical' }} /></Field>
        <Field label="Inventory match query (optional)"><input className="input" value={g.matchQuery} onChange={e => set({ matchQuery: e.target.value })} placeholder="SUV under $30,000" /></Field>

        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, marginTop: 8 }}>Sections</div>
        {g.body.map((sec, i) => (
          <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input className="input" value={sec.heading} onChange={e => updateSection(i, { heading: e.target.value })} placeholder="Section heading (use “Carson AI tip” for a highlighted box)" />
              <button onClick={() => set({ body: g.body.filter((_, j) => j !== i) })} className="btn btn-ghost btn-sm" style={{ color: '#A8232C' }}>×</button>
            </div>
            <textarea className="input" value={sec.text} onChange={e => updateSection(i, { text: e.target.value })} placeholder="Section text…" style={{ minHeight: 80, fontFamily: 'inherit', resize: 'vertical' }} />
          </div>
        ))}
        <button onClick={() => set({ body: [...g.body, { heading: '', text: '' }] })} className="btn btn-ghost btn-sm">+ Add section</button>

        <Field label="">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginTop: 16 }}>
            <input type="checkbox" checked={g.published !== false} onChange={e => set({ published: e.target.checked })} style={{ accentColor: 'var(--teal)' }} /> Published (visible on the site)
          </label>
        </Field>

        {error && <div style={{ background: '#FDECEE', color: '#A8232C', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginTop: 8 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={submit} disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : <><Icon name="check" size={14} /> {isNew ? 'Create guide' : 'Save changes'}</>}</button>
          <button onClick={() => router.push('/admin/guides')} className="btn btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  );
}
