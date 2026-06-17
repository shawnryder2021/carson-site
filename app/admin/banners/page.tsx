'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { HeroMedia } from '@/components/HeroMedia';
import { youTubeId, HeroMode } from '@/data/heroConfig';
import { getBrowserClient } from '@/lib/supabase/client';
import { complete } from '@/lib/ai';
import {
  listBanners, addBanner, saveAllBanners, deleteBanner, listVehicles,
  getSettings, saveSettings, isSupabaseConfigured, MarketingBanner, AdminVehicle, SiteSettings,
} from '@/lib/db';

const OCCASIONS = ['', 'Spring Sale', 'Summer Clearance', 'Year-End Event', '0% Financing', 'New Arrivals', 'Trade-In Bonus', 'Winter-Ready', 'Long Weekend Sale', 'Certified Pre-Owned'];
const MOODS = ['Energetic & bold', 'Premium & sleek', 'Warm & friendly', 'Adventurous & rugged', 'Fresh & bright', 'Cozy winter'];
const SETTINGS = ['Coastal Nova Scotia highway', 'Sunlit dealership lot', 'Snowy mountain road', 'Modern showroom', 'City street at golden hour', 'Autumn countryside'];
const BODY_SUBJECTS = ['a sleek SUV', 'a family SUV', 'a pickup truck', 'a modern sedan', 'a sporty coupe', 'a row of vehicles'];

const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' };
const uid = () => `b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

function styleSuffix(side: string) {
  const where = side === 'left' ? 'left' : side === 'right' ? 'right' : 'center';
  return ` Cinematic automotive advertising photograph, photorealistic, dramatic natural lighting, shallow depth of field, rule-of-thirds, subtle blue (#1E8FC4) brand color accents, ultra-detailed, professional commercial quality. Keep a clean, uncluttered ${where} area with a simple background for text overlay. Absolutely no text, no words, no logos, no watermarks.`;
}

export default function AdminBanners() {
  const [banners, setBanners] = useState<MarketingBanner[]>([]);
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [editing, setEditing] = useState<string | null>(null); // banner id open in editor
  const [status, setStatus] = useState<'idle' | 'working' | 'error'>('idle');
  const [statusText, setStatusText] = useState('');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // Structured builder
  const [occasion, setOccasion] = useState('');
  const [subject, setSubject] = useState(BODY_SUBJECTS[0]);
  const [vehicleId, setVehicleId] = useState('');
  const [mood, setMood] = useState(MOODS[0]);
  const [setting, setSetting] = useState(SETTINGS[0]);
  const [side, setSide] = useState<'left' | 'center' | 'right'>('left');
  const [finalPrompt, setFinalPrompt] = useState('');

  // Fallback hero (shown when no banners are active)
  const [hero, setHero] = useState<SiteSettings | null>(null);
  const [heroSaved, setHeroSaved] = useState(false);
  const [heroErr, setHeroErr] = useState<string | null>(null);

  useEffect(() => { listBanners().then(setBanners); listVehicles().then(setVehicles); getSettings().then(setHero); }, []);

  const setHeroField = (patch: Partial<SiteSettings>) => setHero(prev => prev ? { ...prev, ...patch } : prev);
  const saveHero = async () => {
    if (!hero) return;
    setHeroErr(null);
    if (hero.mode === 'video' && !youTubeId(hero.videoUrl)) { setHeroErr('Enter a valid YouTube URL.'); return; }
    const { error } = await saveSettings(hero);
    if (error) { setHeroErr(error); return; }
    setHeroSaved(true); setTimeout(() => setHeroSaved(false), 2200);
  };

  // Compose the structured fields into the editable final prompt.
  useEffect(() => {
    const veh = vehicles.find(v => v.id === vehicleId);
    const subjectDesc = veh ? `a ${veh.year} ${veh.make} ${veh.model} (${veh.body})` : subject;
    const occ = occasion ? `${occasion} promotion. ` : '';
    setFinalPrompt(`${occ}A ${mood.toLowerCase()} car dealership marketing banner featuring ${subjectDesc} on ${setting.toLowerCase()}.${styleSuffix(side)}`);
  }, [occasion, subject, vehicleId, mood, setting, side, vehicles]);

  const token = async () => {
    const sb = getBrowserClient();
    const { data } = await sb!.auth.getSession();
    return data?.session?.access_token || '';
  };
  const api = async (payload: any) => {
    const res = await fetch('/api/banner', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify(payload) });
    return res.json();
  };

  const saveList = async (list: MarketingBanner[]) => {
    const { error } = await saveAllBanners(list);
    setSavedMsg(error ? `Error: ${error}` : '✓ Saved');
    setTimeout(() => setSavedMsg(null), 1800);
  };

  // Functional updates so we never persist a stale list (e.g. right after a
  // generate, when React state hasn't yet flushed the new banner).
  const update = (id: string, patch: Partial<MarketingBanner>) =>
    setBanners(prev => {
      const next = prev.map(b => b.id === id ? { ...b, ...patch } : b);
      saveList(next);
      return next;
    });

  const move = (id: string, dir: -1 | 1) =>
    setBanners(prev => {
      const idx = prev.findIndex(b => b.id === id);
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      saveList(next);
      return next;
    });

  const remove = async (id: string) => {
    if (!confirm('Delete this banner?')) return;
    await deleteBanner(id);
    setBanners(await listBanners());
  };

  const generate = async () => {
    setStatus('working');
    setStatusText('Sending your prompt to GPT Image 2…');
    try {
      const start = await api({ action: 'generate', prompt: finalPrompt, size: '3:2' });
      if (start.error || !start.taskId) throw new Error(start.error || 'Could not start generation');
      setStatusText('Painting your banner… 20–60 seconds.');
      let urls: string[] = [];
      for (let i = 0; i < 50; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const st = await api({ action: 'status', taskId: start.taskId });
        if (st.status === 'done' && st.urls?.length) { urls = st.urls; break; }
        if (st.status === 'failed') throw new Error(st.error || 'Generation failed');
      }
      if (!urls.length) throw new Error('Timed out. Try again.');
      setStatusText('Saving…');
      const saved = await api({ action: 'save', url: urls[0] });
      if (saved.error || !saved.publicUrl) throw new Error(saved.error || 'Could not save image');

      const banner: MarketingBanner = {
        id: uid(), url: saved.publicUrl, prompt: finalPrompt,
        headline: '', subhead: '', offerBadge: '', ctaLabel: 'Shop now', ctaUrl: '/inventory',
        align: side, theme: 'dark', active: false, sortOrder: 0, createdAt: new Date().toISOString(),
      };
      await addBanner(banner);
      const list = await listBanners();
      setBanners(list);
      setEditing(banner.id);
      setStatus('idle'); setStatusText('');
      draftCopy(banner.id, finalPrompt);  // auto-draft copy
    } catch (e: any) {
      setStatus('error');
      setStatusText(e?.message || 'Something went wrong.');
    }
  };

  const draftCopy = async (id: string, promptText: string) => {
    try {
      const reply = await complete(
        `You write punchy car-dealership banner copy. Occasion: "${occasion || 'general promotion'}". Scene: "${promptText}". ` +
        `Return ONLY JSON with keys headline, subhead, offerBadge, ctaLabel, ctaUrl. ` +
        `headline: 2-5 words, bold. subhead: one short sentence. offerBadge: a short tag like "$0 DOWN" or "0% APR" or "" if none. ` +
        `ctaLabel: 2-3 words. ctaUrl: a site path — one of /inventory, /carfinder, /finance, /tradein, /p/service.`);
      const json = JSON.parse(reply.replace(/```json|```/g, '').trim());
      update(id, {
        headline: json.headline || '', subhead: json.subhead || '', offerBadge: json.offerBadge || '',
        ctaLabel: json.ctaLabel || 'Shop now', ctaUrl: json.ctaUrl || '/inventory',
      });
    } catch { /* leave fields for manual entry */ }
  };

  const activeCount = banners.filter(b => b.active).length;

  return (
    <div style={{ padding: '32px 40px 60px', maxWidth: 1000 }}>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 6px' }}>Banner Studio</h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px' }}>
        Build marketing banners — AI paints the background, you set the headline, offer & button. Active banners rotate in the homepage hero. {activeCount} active.
      </p>

      {!isSupabaseConfigured && (
        <div style={{ background: '#FFF4E5', color: '#8A5400', borderRadius: 12, padding: '14px 16px', fontSize: 14, marginBottom: 20 }}>Connect Supabase to create banners.</div>
      )}

      {/* Fallback hero (video/image) — shown when no banners are active */}
      {hero && (
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '22px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: 19, fontWeight: 600, margin: 0 }}>Homepage hero (video / image)</h2>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Shows when no banners are live above.</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px' }}>
            Your homepage shows live banners as a rotating carousel. When none are active, it falls back to this video or image hero.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }} className="rg">
            <div>
              <label style={lbl}>Type</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {(['video', 'image'] as HeroMode[]).map(m => (
                  <button key={m} onClick={() => setHeroField({ mode: m })} style={{
                    flex: 1, padding: '10px', borderRadius: 10, textTransform: 'capitalize',
                    background: hero.mode === m ? 'var(--ink)' : 'white', color: hero.mode === m ? 'white' : 'var(--ink)',
                    border: '1px solid ' + (hero.mode === m ? 'var(--ink)' : 'var(--line)'), cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                  }}>{m}</button>
                ))}
              </div>
              {hero.mode === 'video' ? (
                <>
                  <label style={lbl}>YouTube URL</label>
                  <input className="input" value={hero.videoUrl} onChange={e => setHeroField({ videoUrl: e.target.value })} style={{ marginBottom: 4, borderColor: youTubeId(hero.videoUrl) ? undefined : '#A8232C' }} />
                  <div style={{ fontSize: 12, color: youTubeId(hero.videoUrl) ? 'var(--teal-2)' : '#A8232C', marginBottom: 14 }}>{youTubeId(hero.videoUrl) ? '✓ Valid' : '⚠ Enter a valid YouTube link'}</div>
                </>
              ) : (
                <>
                  <label style={lbl}>Image URL</label>
                  <input className="input" value={hero.imageUrl} onChange={e => setHeroField({ imageUrl: e.target.value })} placeholder="https://…/showroom.jpg" style={{ marginBottom: 14 }} />
                </>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
                <input type="checkbox" checked={hero.showOverlay} onChange={e => setHeroField({ showOverlay: e.target.checked })} style={{ accentColor: 'var(--teal)' }} />
                Show text &amp; search over the hero
              </label>
              {hero.showOverlay ? (
                <>
                  <label style={lbl}>Headline</label>
                  <input className="input" value={hero.headline} onChange={e => setHeroField({ headline: e.target.value })} style={{ marginBottom: 14 }} />
                  <label style={lbl}>Subtext</label>
                  <textarea className="input" value={hero.subtext} onChange={e => setHeroField({ subtext: e.target.value })} style={{ minHeight: 60, fontFamily: 'inherit', resize: 'vertical' }} />
                </>
              ) : (
                <>
                  <label style={lbl}>Banner link (where clicks go)</label>
                  <input className="input" value={hero.linkUrl} onChange={e => setHeroField({ linkUrl: e.target.value })} placeholder="/inventory or https://…" />
                </>
              )}
            </div>
            <div>
              <label style={lbl}>Preview</label>
              <HeroMedia hero={hero} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <button onClick={saveHero} className="btn btn-dark btn-sm"><Icon name="check" size={14} /> Save hero</button>
            {heroSaved && <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal-2)' }}>✓ Saved</span>}
            {heroErr && <span style={{ fontSize: 13, fontWeight: 700, color: '#A8232C' }}>{heroErr}</span>}
          </div>
        </div>
      )}

      {/* Builder */}
      <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '22px 24px', marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 14 }}>1 · Design the image</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }} className="rg">
          <div><label style={lbl}>Occasion</label>
            <select className="input" value={occasion} onChange={e => setOccasion(e.target.value)}>{OCCASIONS.map(o => <option key={o} value={o}>{o || 'General'}</option>)}</select></div>
          <div><label style={lbl}>Vehicle subject</label>
            <select className="input" value={vehicleId || subject} onChange={e => { const v = vehicles.find(x => x.id === e.target.value); if (v) { setVehicleId(v.id); } else { setVehicleId(''); setSubject(e.target.value); } }}>
              {BODY_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              <option disabled>── from inventory ──</option>
              {vehicles.slice(0, 30).map(v => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>)}
            </select></div>
          <div><label style={lbl}>Mood</label>
            <select className="input" value={mood} onChange={e => setMood(e.target.value)}>{MOODS.map(m => <option key={m}>{m}</option>)}</select></div>
          <div><label style={lbl}>Setting</label>
            <select className="input" value={setting} onChange={e => setSetting(e.target.value)}>{SETTINGS.map(s => <option key={s}>{s}</option>)}</select></div>
          <div><label style={lbl}>Text sits on the</label>
            <select className="input" value={side} onChange={e => setSide(e.target.value as any)}>
              <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
            </select></div>
        </div>
        <label style={lbl}>Final prompt (editable)</label>
        <textarea className="input" value={finalPrompt} onChange={e => setFinalPrompt(e.target.value)} style={{ minHeight: 80, fontFamily: 'inherit', fontSize: 13, resize: 'vertical', marginBottom: 12 }} />
        <button onClick={generate} disabled={status === 'working' || !finalPrompt.trim()} className="btn btn-primary">
          <Icon name="sparkles" size={15} /> {status === 'working' ? 'Generating…' : 'Generate banner'}
        </button>
        {status !== 'idle' && statusText && (
          <span style={{ marginLeft: 12, fontSize: 13.5, fontWeight: 600, color: status === 'error' ? '#A8232C' : 'var(--teal-2)' }}>{statusText}</span>
        )}
      </div>

      {/* Library / editor */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 600, letterSpacing: '-.02em', margin: 0 }}>Your banners</h2>
        {savedMsg && <span style={{ fontSize: 13, fontWeight: 700, color: savedMsg.startsWith('Error') ? '#A8232C' : 'var(--teal-2)' }}>{savedMsg}</span>}
      </div>
      {banners.length > 0 && (
        <div style={{ background: 'var(--teal-tint)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--teal-2)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Icon name="info" size={14} />
          <span>
            <strong>{activeCount} of {banners.length}</strong> on the homepage. Tap <strong>Add to homepage</strong> on any banner — the headline, offer &amp; button you set appear as the overlay. Multiple = an auto-rotating hero.
          </span>
          <a href="/" target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', fontWeight: 700, textDecoration: 'underline' }}>View homepage ↗</a>
        </div>
      )}

      {banners.length === 0 ? (
        <div style={{ fontSize: 13.5, color: 'var(--muted)', background: 'var(--bg-soft)', borderRadius: 12, padding: 20 }}>No banners yet — generate your first above.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {banners.map((b, i) => (
            <div key={b.id} style={{ background: 'white', border: '1px solid ' + (b.active ? 'var(--teal)' : 'var(--line)'), borderRadius: 14, overflow: 'hidden' }}>
              {/* Preview with live overlay */}
              <BannerPreview b={b} />
              <div style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {b.active ? (
                    <button onClick={() => update(b.id, { active: false })} className="btn btn-sm" style={{ background: 'var(--teal)', color: 'white', border: '1px solid var(--teal)' }}>
                      <Icon name="check" size={14} /> On homepage
                    </button>
                  ) : (
                    <button onClick={() => update(b.id, { active: true })} className="btn btn-primary btn-sm">
                      <Icon name="plus" size={14} /> Add to homepage
                    </button>
                  )}
                  {!b.headline && !b.ctaLabel && (
                    <span style={{ fontSize: 12, color: '#8A5400', fontWeight: 600 }}>← add a headline first (Edit)</span>
                  )}
                  <span style={{ flex: 1 }} />
                  <button onClick={() => move(b.id, -1)} disabled={i === 0} className="btn btn-ghost btn-sm"><Icon name="chevronUp" size={13} /></button>
                  <button onClick={() => move(b.id, 1)} disabled={i === banners.length - 1} className="btn btn-ghost btn-sm"><Icon name="chevronDown" size={13} /></button>
                  <button onClick={() => setEditing(editing === b.id ? null : b.id)} className="btn btn-ghost btn-sm">{editing === b.id ? 'Close' : (b.headline || b.ctaLabel ? 'Edit text' : '✏️ Add text')}</button>
                  <button onClick={() => remove(b.id)} className="btn btn-ghost btn-sm" style={{ color: '#A8232C' }}><Icon name="trash" size={13} /></button>
                </div>

                {editing === b.id && (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                    <button onClick={() => draftCopy(b.id, b.prompt)} className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}><Icon name="sparkles" size={13} /> Draft copy with AI</button>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="rg">
                      <div><label style={lbl}>Headline</label><input className="input" value={b.headline} onChange={e => update(b.id, { headline: e.target.value })} /></div>
                      <div><label style={lbl}>Offer badge</label><input className="input" value={b.offerBadge} onChange={e => update(b.id, { offerBadge: e.target.value })} placeholder="$0 DOWN" /></div>
                      <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Subhead</label><input className="input" value={b.subhead} onChange={e => update(b.id, { subhead: e.target.value })} /></div>
                      <div><label style={lbl}>Button text</label><input className="input" value={b.ctaLabel} onChange={e => update(b.id, { ctaLabel: e.target.value })} /></div>
                      <div><label style={lbl}>Button link</label><input className="input" value={b.ctaUrl} onChange={e => update(b.id, { ctaUrl: e.target.value })} placeholder="/inventory" /></div>
                      <div><label style={lbl}>Text position</label>
                        <select className="input" value={b.align} onChange={e => update(b.id, { align: e.target.value as any })}>
                          <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                        </select></div>
                      <div><label style={lbl}>Text color</label>
                        <select className="input" value={b.theme} onChange={e => update(b.id, { theme: e.target.value as any })}>
                          <option value="dark">Light text (dark image)</option><option value="light">Dark text (light image)</option>
                        </select></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Compact preview mirroring the live carousel overlay.
function BannerPreview({ b }: { b: MarketingBanner }) {
  const dark = b.theme !== 'light';
  const fg = dark ? 'white' : '#0b0f14';
  const justify = b.align === 'left' ? 'flex-start' : b.align === 'right' ? 'flex-end' : 'center';
  const textAlign = b.align === 'center' ? 'center' : 'left';
  const scrim = b.align === 'right'
    ? `linear-gradient(to left, ${dark ? 'rgba(8,12,18,.72)' : 'rgba(255,255,255,.78)'} 0%, transparent 65%)`
    : b.align === 'left'
      ? `linear-gradient(to right, ${dark ? 'rgba(8,12,18,.72)' : 'rgba(255,255,255,.78)'} 0%, transparent 65%)`
      : `linear-gradient(to bottom, rgba(8,12,18,.3), ${dark ? 'rgba(8,12,18,.7)' : 'rgba(255,255,255,.55)'})`;
  return (
    <div style={{ position: 'relative', aspectRatio: '3 / 1.1', overflow: 'hidden', background: 'var(--bg-soft)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={b.url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', inset: 0, background: scrim }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: justify, padding: '0 6%' }}>
        <div style={{ maxWidth: '60%', textAlign, color: fg }}>
          {b.offerBadge && <span style={{ display: 'inline-block', background: 'var(--teal)', color: 'white', fontWeight: 800, fontSize: 10, letterSpacing: '.04em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 999, marginBottom: 6 }}>{b.offerBadge}</span>}
          {b.headline && <div style={{ fontFamily: 'var(--display)', fontSize: 'clamp(18px,3.4vw,30px)', fontWeight: 700, lineHeight: 1.05 }}>{b.headline}</div>}
          {b.subhead && <div style={{ fontSize: 12.5, opacity: dark ? 0.9 : 0.7, marginTop: 4 }}>{b.subhead}</div>}
          {b.ctaLabel && <span style={{ display: 'inline-block', marginTop: 8, background: 'var(--teal)', color: 'white', fontSize: 11.5, fontWeight: 700, padding: '6px 12px', borderRadius: 8 }}>{b.ctaLabel} →</span>}
        </div>
      </div>
      {!b.headline && !b.ctaLabel && (
        <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,.5)', color: 'white', fontSize: 11, padding: '3px 8px', borderRadius: 6 }}>Add copy →</div>
      )}
    </div>
  );
}
