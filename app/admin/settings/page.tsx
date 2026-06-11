'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { HeroMedia } from '@/components/HeroMedia';
import { youTubeId, HeroMode } from '@/data/heroConfig';
import { getSettings, saveSettings, isSupabaseConfigured, SiteSettings } from '@/lib/db';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

export default function AdminSettings() {
  const [s, setS] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { (async () => setS(await getSettings()))(); }, []);

  if (!s) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading…</div>;
  const set = (patch: Partial<SiteSettings>) => setS(prev => ({ ...prev!, ...patch }));
  const videoValid = s.mode !== 'video' || !!youTubeId(s.videoUrl);

  const save = async () => {
    setError(null);
    if (!videoValid) { setError('Enter a valid YouTube URL.'); return; }
    setSaving(true);
    const { error } = await saveSettings(s);
    setSaving(false);
    if (error) { setError(error); return; }
    setSaved(true); setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div style={{ padding: '32px 40px 60px', maxWidth: 1000 }}>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 6px' }}>Site settings</h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px' }}>Hero, contact details, and hours — changes go live for all visitors.</p>

      {!isSupabaseConfigured && (
        <div style={{ background: '#FFF4E5', color: '#8A5400', borderRadius: 12, padding: '14px 16px', fontSize: 14, marginBottom: 20 }}>
          Connect Supabase to save changes for all visitors.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, alignItems: 'start' }}>
        {/* Hero */}
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '24px 26px' }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 19, fontWeight: 600, margin: '0 0 18px' }}>Hero</h2>
          <Field label="Type">
            <div style={{ display: 'flex', gap: 8 }}>
              {(['video', 'image'] as HeroMode[]).map(m => (
                <button key={m} onClick={() => set({ mode: m })} style={{
                  flex: 1, padding: '10px', borderRadius: 10, textTransform: 'capitalize',
                  background: s.mode === m ? 'var(--ink)' : 'white', color: s.mode === m ? 'white' : 'var(--ink)',
                  border: '1px solid ' + (s.mode === m ? 'var(--ink)' : 'var(--line)'), cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                }}>{m}</button>
              ))}
            </div>
          </Field>
          {s.mode === 'video' ? (
            <Field label="YouTube URL" hint={videoValid ? '✓ Valid' : '⚠ Enter a valid YouTube link'}>
              <input className="input" value={s.videoUrl} onChange={e => set({ videoUrl: e.target.value })} style={{ borderColor: videoValid ? undefined : '#A8232C' }} />
            </Field>
          ) : (
            <Field label="Image URL" hint="Direct link to a wide 16:9 image.">
              <input className="input" value={s.imageUrl} onChange={e => set({ imageUrl: e.target.value })} placeholder="https://…/showroom.jpg" />
            </Field>
          )}
          <Field label="Headline"><input className="input" value={s.headline} onChange={e => set({ headline: e.target.value })} /></Field>
          <Field label="Subtext"><textarea className="input" value={s.subtext} onChange={e => set({ subtext: e.target.value })} style={{ minHeight: 64, fontFamily: 'inherit', resize: 'vertical' }} /></Field>

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>Preview</div>
          <HeroMedia hero={s} />
        </div>

        {/* Contact */}
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '24px 26px' }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 19, fontWeight: 600, margin: '0 0 18px' }}>Contact</h2>
          <Field label="Address"><input className="input" value={s.contactAddress} onChange={e => set({ contactAddress: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" value={s.contactPhone} onChange={e => set({ contactPhone: e.target.value })} /></Field>
          <Field label="Email"><input className="input" value={s.contactEmail} onChange={e => set({ contactEmail: e.target.value })} /></Field>

          <h2 style={{ fontFamily: 'var(--display)', fontSize: 19, fontWeight: 600, margin: '24px 0 14px' }}>Hours</h2>
          {s.hours.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input className="input" value={h.day} onChange={e => { const hours = [...s.hours]; hours[i] = { ...hours[i], day: e.target.value }; set({ hours }); }} placeholder="Mon–Fri" />
              <input className="input" value={h.time} onChange={e => { const hours = [...s.hours]; hours[i] = { ...hours[i], time: e.target.value }; set({ hours }); }} placeholder="9 AM–7 PM" />
              <button onClick={() => set({ hours: s.hours.filter((_, j) => j !== i) })} className="btn btn-ghost btn-sm" style={{ color: '#A8232C' }}>×</button>
            </div>
          ))}
          <button onClick={() => set({ hours: [...s.hours, { day: '', time: '' }] })} className="btn btn-ghost btn-sm" style={{ marginTop: 4 }}>+ Add row</button>
        </div>
      </div>

      {error && <div style={{ background: '#FDECEE', color: '#A8232C', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginTop: 18 }}>{error}</div>}

      <div style={{ position: 'sticky', bottom: 0, marginTop: 24, padding: '16px 0', display: 'flex', gap: 10 }}>
        <button onClick={save} disabled={saving || !isSupabaseConfigured} className="btn btn-primary btn-lg">
          {saved ? <><Icon name="check" size={16} /> Saved!</> : saving ? 'Saving…' : 'Save all settings'}
        </button>
      </div>
    </div>
  );
}
