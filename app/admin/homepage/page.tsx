'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import {
  getHomepageSections, saveHomepageSections, HOME_SECTIONS,
  DEFAULT_HOME_SECTIONS, HomeSections, isSupabaseConfigured,
} from '@/lib/db';

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        width: 46, height: 27, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
        background: on ? 'var(--teal)' : '#c9ccce', position: 'relative', transition: 'background .2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 22 : 3, width: 21, height: 21, borderRadius: '50%',
        background: 'white', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)',
      }} />
    </button>
  );
}

export default function AdminHomepage() {
  const [sections, setSections] = useState<HomeSections | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getHomepageSections().then(setSections); }, []);

  if (!sections) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading…</div>;

  const toggle = (key: keyof HomeSections) => setSections(s => ({ ...s!, [key]: !s![key] }));

  const save = async () => {
    setError(null); setSaving(true);
    const { error } = await saveHomepageSections(sections);
    setSaving(false);
    if (error) { setError(error); return; }
    setSaved(true); setTimeout(() => setSaved(false), 2200);
  };

  const onCount = HOME_SECTIONS.filter(s => sections[s.key]).length;

  return (
    <div style={{ padding: '32px 40px 60px', maxWidth: 760 }}>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 6px' }}>Homepage sections</h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px' }}>
        Turn homepage sections on or off. The hero and search bar always stay on. {onCount}/{HOME_SECTIONS.length} sections visible.
      </p>

      {!isSupabaseConfigured && (
        <div style={{ background: '#FFF4E5', color: '#8A5400', borderRadius: 12, padding: '14px 16px', fontSize: 14, marginBottom: 20 }}>
          Connect Supabase to save changes for all visitors.
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
        {HOME_SECTIONS.map((s, i) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderBottom: i < HOME_SECTIONS.length - 1 ? '1px solid var(--line)' : 'none', opacity: sections[s.key] ? 1 : 0.6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{s.desc}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: sections[s.key] ? 'var(--teal-2)' : 'var(--muted)', minWidth: 26, textAlign: 'right' }}>
              {sections[s.key] ? 'On' : 'Off'}
            </span>
            <Toggle on={sections[s.key]} onClick={() => toggle(s.key)} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 22 }}>
        <button onClick={save} disabled={saving} className="btn btn-primary">
          <Icon name="check" size={15} /> {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button onClick={() => setSections(DEFAULT_HOME_SECTIONS)} className="btn btn-ghost btn-sm">Turn all on</button>
        {saved && <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--teal-2)' }}>✓ Saved — live on the homepage.</span>}
        {error && <span style={{ fontSize: 13.5, fontWeight: 700, color: '#A8232C' }}>{error}</span>}
      </div>
    </div>
  );
}
