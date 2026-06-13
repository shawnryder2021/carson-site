'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { getBrowserClient } from '@/lib/supabase/client';
import {
  getSettings, saveSettings, listBanners, addBanner, deleteBanner,
  isSupabaseConfigured, MarketingBanner, SiteSettings,
} from '@/lib/db';

const PRESETS = [
  { label: 'Spring sale', prompt: 'Bright spring car sale banner: a clean modern SUV on a sunlit road with cherry blossoms, cheerful and fresh, lots of clean empty space on the left for a headline.' },
  { label: '0% financing', prompt: 'Premium financing promotion banner: a luxury sedan in a sleek studio with soft blue lighting, confident and trustworthy mood, generous clean negative space on the left for text.' },
  { label: 'New arrivals', prompt: 'Dynamic "new arrivals" banner: a row of shiny vehicles on a dealership lot at golden hour, exciting and aspirational, open sky area for a headline.' },
  { label: 'Winter ready', prompt: 'Winter-ready AWD banner: a rugged SUV driving through light snow on a scenic mountain road, cool tones, safe and capable feeling, clean space on the left for text.' },
  { label: 'Trade-in event', prompt: 'Trade-in event banner: a happy handshake over car keys in a bright modern showroom, friendly and welcoming, soft bokeh, clean area for a headline.' },
];

const STYLE_SUFFIX = ' Photorealistic, professional advertising photography, wide cinematic 3:2 composition, high detail, no text, no logos, no watermarks.';

export default function AdminBanners() {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'3:2' | '1:1' | '2:3'>('3:2');
  const [status, setStatus] = useState<'idle' | 'working' | 'error'>('idle');
  const [statusText, setStatusText] = useState('');
  const [preview, setPreview] = useState<MarketingBanner | null>(null);
  const [library, setLibrary] = useState<MarketingBanner[]>([]);

  // Hero text options applied when setting a banner live
  const [headline, setHeadline] = useState('');
  const [subtext, setSubtext] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showOverlay, setShowOverlay] = useState(true);
  const [settingLive, setSettingLive] = useState<string | null>(null);
  const [liveMsg, setLiveMsg] = useState<string | null>(null);

  useEffect(() => { listBanners().then(setLibrary); }, []);

  const token = async () => {
    const sb = getBrowserClient();
    const { data } = await sb!.auth.getSession();
    return data?.session?.access_token || '';
  };

  const api = async (payload: any) => {
    const res = await fetch('/api/banner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify(payload),
    });
    return res.json();
  };

  const generate = async () => {
    if (!prompt.trim()) return;
    setStatus('working');
    setStatusText('Sending your prompt to GPT Image 2…');
    setPreview(null);
    try {
      const start = await api({ action: 'generate', prompt: prompt.trim() + STYLE_SUFFIX, size });
      if (start.error || !start.taskId) throw new Error(start.error || 'Could not start generation');

      // Poll up to ~2.5 minutes.
      setStatusText('Painting your banner… this usually takes 20–60 seconds.');
      let urls: string[] = [];
      for (let i = 0; i < 50; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const st = await api({ action: 'status', taskId: start.taskId });
        if (st.status === 'done' && st.urls?.length) { urls = st.urls; break; }
        if (st.status === 'failed') throw new Error(st.error || 'Generation failed');
      }
      if (urls.length === 0) throw new Error('Timed out waiting for the image. Try again.');

      // Persist into Supabase storage so it never expires.
      setStatusText('Saving your banner…');
      const saved = await api({ action: 'save', url: urls[0] });
      if (saved.error || !saved.publicUrl) throw new Error(saved.error || 'Could not save the image');

      const banner: MarketingBanner = { url: saved.publicUrl, prompt: prompt.trim(), createdAt: new Date().toISOString() };
      await addBanner(banner);
      setPreview(banner);
      setLibrary(await listBanners());
      setStatus('idle');
      setStatusText('');
    } catch (e: any) {
      setStatus('error');
      setStatusText(e?.message || 'Something went wrong.');
    }
  };

  const setAsHero = async (banner: MarketingBanner) => {
    setSettingLive(banner.url);
    setLiveMsg(null);
    const current = await getSettings();
    const next: SiteSettings = {
      ...current,
      mode: 'image',
      imageUrl: banner.url,
      headline: headline.trim() || current.headline,
      subtext: subtext.trim() || current.subtext,
      linkUrl: linkUrl.trim(),
      showOverlay,
    };
    const { error } = await saveSettings(next);
    setSettingLive(null);
    setLiveMsg(error ? `Error: ${error}` : '✓ Live! Your homepage hero now shows this banner.');
  };

  const remove = async (url: string) => {
    if (!confirm('Remove this banner from your library? (It won’t change your live hero.)')) return;
    await deleteBanner(url);
    setLibrary(await listBanners());
    if (preview?.url === url) setPreview(null);
  };

  return (
    <div style={{ padding: '32px 40px 60px', maxWidth: 1000 }}>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 6px' }}>Banner Studio</h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px' }}>
        Describe a marketing banner and GPT Image 2 creates it. Set any banner as your homepage hero in one click.
      </p>

      {!isSupabaseConfigured && (
        <div style={{ background: '#FFF4E5', color: '#8A5400', borderRadius: 12, padding: '14px 16px', fontSize: 14, marginBottom: 20 }}>
          Connect Supabase to save and publish banners.
        </div>
      )}

      {/* Composer */}
      <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '22px 24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => setPrompt(p.prompt)} style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 999, padding: '7px 14px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', color: 'var(--ink)' }}>
              {p.label}
            </button>
          ))}
        </div>
        <textarea
          className="input"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe your banner… e.g. 'Summer clearance event, red convertible on a coastal road, bold and exciting, space on the left for a headline.'"
          style={{ minHeight: 90, fontFamily: 'inherit', resize: 'vertical', marginBottom: 12 }}
        />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {([['3:2', 'Wide (hero)'], ['1:1', 'Square'], ['2:3', 'Tall']] as const).map(([v, lbl]) => (
              <button key={v} onClick={() => setSize(v)} style={{
                padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
                background: size === v ? 'var(--teal)' : 'var(--bg-soft)', color: size === v ? 'white' : 'var(--ink)',
                border: '1px solid ' + (size === v ? 'var(--teal)' : 'var(--line)'),
              }}>{lbl}</button>
            ))}
          </div>
          <button onClick={generate} disabled={status === 'working' || !prompt.trim()} className="btn btn-primary" style={{ marginLeft: 'auto' }}>
            <Icon name="sparkles" size={15} /> {status === 'working' ? 'Generating…' : 'Generate banner'}
          </button>
        </div>
        {status !== 'idle' && statusText && (
          <div style={{ marginTop: 14, fontSize: 13.5, fontWeight: 600, color: status === 'error' ? '#A8232C' : 'var(--teal-2)' }}>
            {status === 'working' && <Icon name="sparkles" size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />}
            {statusText}
          </div>
        )}
      </div>

      {/* Fresh result + go-live controls */}
      {preview && (
        <div style={{ background: 'white', border: '1px solid var(--teal)', borderRadius: 16, padding: '22px 24px', marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal-2)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 12 }}>Fresh off the press</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.url} alt="Generated banner" style={{ width: '100%', borderRadius: 12, marginBottom: 16, display: 'block' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }} className="rg">
            <input className="input" value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Headline text (optional)" />
            <input className="input" value={subtext} onChange={e => setSubtext(e.target.value)} placeholder="Subtext (optional)" />
            <input className="input" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="Banner click link (optional, e.g. /inventory)" />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600 }}>
              <input type="checkbox" checked={showOverlay} onChange={e => setShowOverlay(e.target.checked)} style={{ accentColor: 'var(--teal)' }} />
              Show headline + search box over the banner
            </label>
          </div>
          <button onClick={() => setAsHero(preview)} disabled={settingLive === preview.url} className="btn btn-dark">
            <Icon name="check" size={14} /> {settingLive === preview.url ? 'Publishing…' : 'Set as homepage hero'}
          </button>
          {liveMsg && <span style={{ marginLeft: 12, fontSize: 13.5, fontWeight: 700, color: liveMsg.startsWith('Error') ? '#A8232C' : 'var(--teal-2)' }}>{liveMsg}</span>}
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
            Tip: turn the overlay off for a banner that already has its own text baked in, and add a click link to send shoppers to a sale page.
          </div>
        </div>
      )}

      {/* Library */}
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 14px' }}>Your banner library</h2>
      {library.length === 0 ? (
        <div style={{ fontSize: 13.5, color: 'var(--muted)', background: 'var(--bg-soft)', borderRadius: 12, padding: '20px' }}>
          No banners yet. Generate your first one above.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {library.map(b => (
            <div key={b.url} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.url} alt="" style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{b.prompt}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setPreview(b); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="btn btn-ghost btn-sm" style={{ flex: 1 }}>Use</button>
                  <button onClick={() => remove(b.url)} className="btn btn-ghost btn-sm" style={{ color: '#A8232C' }}><Icon name="trash" size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
