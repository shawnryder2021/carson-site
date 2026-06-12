'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { getSocialConfig, saveSocialConfig, uploadImage, isSupabaseConfigured, SocialConfig } from '@/lib/db';
import { parseInstagramFeed } from '@/components/InstagramGrid';

const label: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)',
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em',
};

export default function AdminSocial() {
  const [config, setConfig] = useState<SocialConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [newLink, setNewLink] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImage, setPendingImage] = useState('');

  useEffect(() => { getSocialConfig().then(setConfig); }, []);

  if (!config) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading…</div>;

  const save = async (next: SocialConfig) => {
    setBusy(true);
    setMsg(null);
    const { error } = await saveSocialConfig(next);
    setMsg(error ? `Error: ${error}` : 'Saved.');
    if (!error) setConfig(next);
    setBusy(false);
  };

  const testFeed = async () => {
    if (!config.feedUrl) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(config.feedUrl, { cache: 'no-store' });
      const tiles = parseInstagramFeed(await res.json());
      setMsg(tiles.length > 0 ? `✓ Feed works — found ${tiles.length} posts.` : 'Feed responded but no posts were found — double-check the URL.');
    } catch {
      setMsg('Could not read that feed URL — make sure it’s the JSON feed link from Behold.');
    }
    setBusy(false);
  };

  const upload = async (file: File) => {
    setBusy(true);
    const { url, error } = await uploadImage(file);
    setBusy(false);
    if (error || !url) return alert(error || 'Upload failed');
    setPendingImage(url);
  };

  const addTile = () => {
    if (!pendingImage) return alert('Upload a photo first.');
    const next = { ...config, posts: [...config.posts, { image: pendingImage, link: newLink.trim(), caption: '' }] };
    setPendingImage('');
    setNewLink('');
    save(next);
  };

  const removeTile = (i: number) => {
    const next = { ...config, posts: config.posts.filter((_, idx) => idx !== i) };
    save(next);
  };

  return (
    <div style={{ padding: '32px 40px 60px', maxWidth: 860 }}>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 6px' }}>Social / Instagram</h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px' }}>
        Powers the Instagram grid on the homepage and the /social page.
      </p>

      {!isSupabaseConfigured && (
        <div style={{ background: '#FFF4E5', color: '#8A5400', borderRadius: 12, padding: '14px 16px', fontSize: 14, marginBottom: 20 }}>
          Connect Supabase to manage the Instagram grid.
        </div>
      )}

      {msg && (
        <div style={{ background: msg.startsWith('Error') || msg.startsWith('Could') ? '#FDECEC' : 'var(--teal-tint)', color: msg.startsWith('Error') || msg.startsWith('Could') ? '#A8232C' : 'var(--teal-2)', borderRadius: 10, padding: '12px 14px', fontSize: 13.5, marginBottom: 16, fontWeight: 600 }}>
          {msg}
        </div>
      )}

      {/* Handle + auto feed */}
      <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 24px', marginBottom: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 14 }}>
          Auto mode (recommended) — grid updates itself
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={label}>Instagram handle</label>
            <input className="input" value={config.handle} onChange={e => setConfig({ ...config, handle: e.target.value })} placeholder="carsonexports" />
          </div>
          <div>
            <label style={label}>Feed URL (from Behold.so)</label>
            <input className="input" value={config.feedUrl} onChange={e => setConfig({ ...config, feedUrl: e.target.value })} placeholder="https://feeds.behold.so/…" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => save(config)} disabled={busy} className="btn btn-primary btn-sm">Save</button>
          <button onClick={testFeed} disabled={busy || !config.feedUrl} className="btn btn-ghost btn-sm">Test feed</button>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 12, lineHeight: 1.6 }}>
          <strong>5-minute setup:</strong> go to <strong>behold.so</strong> → sign up free → connect the @{config.handle || 'carsonexports'} Instagram account →
          create a feed (JSON type) → copy the feed URL here. New Instagram posts then appear on the site automatically. No feed URL? The manual tiles below are used instead.
        </div>
      </div>

      {/* Manual tiles */}
      <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 24px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 14 }}>
          Manual tiles {config.feedUrl ? '(used only if the feed fails)' : '(currently shown on the site)'}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <label style={label}>Photo</label>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn btn-ghost btn-sm">
              {pendingImage ? '✓ Photo ready' : 'Upload photo'}
            </button>
          </div>
          {pendingImage && (
            <span style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </span>
          )}
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={label}>Instagram post link (optional)</label>
            <input className="input" value={newLink} onChange={e => setNewLink(e.target.value)} placeholder="https://www.instagram.com/p/…" />
          </div>
          <button onClick={addTile} disabled={busy || !pendingImage} className="btn btn-primary btn-sm">
            <Icon name="plus" size={13} /> Add tile
          </button>
        </div>

        {config.posts.length === 0 ? (
          <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>No manual tiles yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
            {config.posts.map((t, i) => (
              <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  onClick={() => removeTile(i)}
                  disabled={busy}
                  style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,.65)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="trash" size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
