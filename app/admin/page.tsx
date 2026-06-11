'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/components/Icon';
import { HeroMedia } from '@/components/HeroMedia';
import { useHeroConfig } from '@/context/HeroConfigContext';
import { HeroConfig, HeroMode, youTubeId, DEFAULT_HERO } from '@/data/heroConfig';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.02em', marginBottom: 6 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

export default function AdminPage() {
  const { hero, hasOverride, save, reset } = useHeroConfig();
  const [draft, setDraft] = useState<HeroConfig>(hero);
  const [saved, setSaved] = useState(false);

  // keep draft in sync once the stored config loads
  useEffect(() => { setDraft(hero); }, [hero]);

  const update = (patch: Partial<HeroConfig>) => setDraft(d => ({ ...d, ...patch }));

  const videoValid = draft.mode !== 'video' || !!youTubeId(draft.videoUrl);

  const handleSave = () => {
    save(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className="page fade-in">
      <div className="container" style={{ maxWidth: 1100, padding: '40px 20px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--ink)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="sparkles" size={18} />
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: 0 }}>Hero Editor</h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 28px', maxWidth: 640, lineHeight: 1.55 }}>
          Change the homepage hero — video or image, plus the headline. Changes save instantly to <strong>this browser</strong> so you can preview them live.
          To make a change permanent for all visitors, use <strong>Copy config</strong> below and commit it.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 36, alignItems: 'start' }}>
          {/* Editor */}
          <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '24px 26px' }}>
            <Field label="Hero type">
              <div style={{ display: 'flex', gap: 8 }}>
                {(['video', 'image'] as HeroMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => update({ mode: m })}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: 10,
                      background: draft.mode === m ? 'var(--ink)' : 'white',
                      color: draft.mode === m ? 'white' : 'var(--ink)',
                      border: '1px solid ' + (draft.mode === m ? 'var(--ink)' : 'var(--line)'),
                      cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, textTransform: 'capitalize',
                    }}
                  >
                    <Icon name={m === 'video' ? 'sparkles' : 'car'} size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />{m}
                  </button>
                ))}
              </div>
            </Field>

            {draft.mode === 'video' ? (
              <Field label="YouTube URL or ID" hint={videoValid ? '✓ Valid YouTube link' : '⚠ Paste a valid YouTube URL (e.g. https://www.youtube.com/watch?v=…)'}>
                <input
                  className="input"
                  value={draft.videoUrl}
                  onChange={e => update({ videoUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=oPf6ktf4aHI"
                  style={{ borderColor: videoValid ? undefined : '#A8232C' }}
                />
              </Field>
            ) : (
              <Field label="Image URL" hint="Paste a direct image link (https://…/photo.jpg). For best results use a wide 16:9 image.">
                <input
                  className="input"
                  value={draft.imageUrl}
                  onChange={e => update({ imageUrl: e.target.value })}
                  placeholder="https://…/showroom.jpg"
                />
              </Field>
            )}

            <Field label="Headline">
              <input className="input" value={draft.headline} onChange={e => update({ headline: e.target.value })} />
            </Field>

            <Field label="Subtext">
              <textarea
                className="input"
                value={draft.subtext}
                onChange={e => update({ subtext: e.target.value })}
                style={{ minHeight: 70, fontFamily: 'inherit', resize: 'none' }}
              />
            </Field>

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={handleSave} disabled={!videoValid} className="btn btn-primary" style={{ flex: 1 }}>
                {saved ? <><Icon name="check" size={14} /> Saved!</> : 'Save & preview'}
              </button>
              <button onClick={() => { reset(); }} className="btn btn-ghost">
                Reset
              </button>
            </div>
            {hasOverride && (
              <div style={{ fontSize: 12, color: 'var(--teal-2)', marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
                <Icon name="info" size={13} /> A custom hero is active in this browser. Reset to restore the published default.
              </div>
            )}
          </div>

          {/* Live preview + export */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>Live preview</div>
            <HeroMedia hero={draft} />
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>{draft.headline}</div>
              <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>{draft.subtext}</div>
            </div>

            {/* Make permanent */}
            <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 20px', marginTop: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Make it permanent (for all visitors)</div>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
                Saving above only updates your browser. To publish for everyone, paste this into <code style={{ background: 'white', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>data/heroConfig.ts</code> as the <code style={{ background: 'white', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>DEFAULT_HERO</code> value and redeploy — or just send it to your developer.
              </p>
              <pre style={{ background: 'var(--ink)', color: '#e6f4f7', borderRadius: 10, padding: '14px 16px', fontSize: 12, overflowX: 'auto', margin: 0 }}>
{`export const DEFAULT_HERO: HeroConfig = ${JSON.stringify(draft, null, 2)};`}
              </pre>
              <button
                onClick={() => navigator.clipboard?.writeText(`export const DEFAULT_HERO: HeroConfig = ${JSON.stringify(draft, null, 2)};`)}
                className="btn btn-dark btn-sm"
                style={{ marginTop: 12 }}
              >
                <Icon name="check" size={13} /> Copy config
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
