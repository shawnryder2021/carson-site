'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { RowsSkeleton } from '@/components/Skeleton';
import { listVehicles, AdminVehicle } from '@/lib/db';
import { getBrowserClient } from '@/lib/supabase/client';
import { vehicleImageURL } from '@/data/vehicleImage';
import { fmtPrice } from '@/lib/format';

// Cars for sale with no real photos yet. Real photos arrive with the nightly
// carsonexports.com sync; meanwhile an admin can generate an AI illustration
// (kie.ai), review it, and approve it. The site labels approved images
// "AI illustration", and real photos replace them automatically.

type GenState =
  | { step: 'idle' }
  | { step: 'generating'; started: number }
  | { step: 'preview'; url: string }
  | { step: 'saving' }
  | { step: 'error'; message: string };

const hasRealPhotos = (v: AdminVehicle) => ((v.images as any[]) || []).some(i => typeof i === 'string');

async function callApi(body: any) {
  const sb = getBrowserClient();
  const token = (await sb?.auth.getSession())?.data.session?.access_token;
  const res = await fetch('/api/vehicle-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json;
}

export default function AdminPhotos() {
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [gen, setGen] = useState<Record<string, GenState>>({});

  const load = async () => {
    setLoading(true);
    const all = await listVehicles({ includeHidden: true });
    setVehicles(all.filter(v => v.status === 'available' && !hasRealPhotos(v)));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (id: string, s: GenState) => setGen(g => ({ ...g, [id]: s }));

  const generate = async (v: AdminVehicle) => {
    set(v.id, { step: 'generating', started: Date.now() });
    try {
      const { taskId } = await callApi({ action: 'generate', vehicleId: v.id });
      // Poll every 4s for up to 3 minutes.
      for (let i = 0; i < 45; i++) {
        await new Promise(r => setTimeout(r, 4000));
        const s = await callApi({ action: 'status', taskId });
        if (s.status === 'done' && s.urls?.length) return set(v.id, { step: 'preview', url: s.urls[0] });
        if (s.status === 'failed') return set(v.id, { step: 'error', message: s.error || 'Generation failed.' });
      }
      set(v.id, { step: 'error', message: 'Timed out waiting for the image. Try again.' });
    } catch (e: any) {
      set(v.id, { step: 'error', message: e.message });
    }
  };

  const approve = async (v: AdminVehicle, url: string) => {
    set(v.id, { step: 'saving' });
    try {
      const { publicUrl } = await callApi({ action: 'save', vehicleId: v.id, url });
      setVehicles(vs => vs.map(x => (x.id === v.id ? { ...x, aiImage: publicUrl } : x)));
      set(v.id, { step: 'idle' });
    } catch (e: any) {
      set(v.id, { step: 'error', message: e.message });
    }
  };

  const remove = async (v: AdminVehicle) => {
    if (!confirm(`Remove the AI illustration for ${v.year} ${v.make} ${v.model}? It goes back to the “Photos coming soon” image.`)) return;
    try {
      await callApi({ action: 'remove', vehicleId: v.id });
      setVehicles(vs => vs.map(x => (x.id === v.id ? { ...x, aiImage: null } : x)));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const withAi = vehicles.filter(v => v.aiImage).length;

  return (
    <div style={{ padding: '32px 40px 60px' }}>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 8px' }}>Missing photos</h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 6px', maxWidth: 760 }}>
        {loading ? 'Loading…' : vehicles.length === 0
          ? 'Every car for sale has photos.'
          : `${vehicles.length} car${vehicles.length === 1 ? '' : 's'} for sale ${vehicles.length === 1 ? 'has' : 'have'} no photos yet${withAi ? ` (${withAi} with an AI illustration)` : ''}.`}
        {' '}Photos added on carsonexports.com arrive with the nightly sync and replace anything here automatically.
      </p>
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 24px', maxWidth: 760 }}>
        <Icon name="info" size={13} style={{ verticalAlign: 'middle' }} /> AI illustrations are shown on the site with an “AI illustration” label, since they aren’t the actual vehicle. Review each one before approving it.
      </p>

      {loading ? <RowsSkeleton rows={4} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
          {vehicles.map(v => {
            const s = gen[v.id] || { step: 'idle' };
            const days = v.createdAt ? Math.max(0, Math.floor((Date.now() - new Date(v.createdAt).getTime()) / 86400000)) : null;
            const shown = s.step === 'preview' ? s.url : vehicleImageURL(v, { size: 400 });
            const isAi = s.step === 'preview' || !!v.aiImage;
            return (
              <div key={v.id} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', aspectRatio: '4/3', background: 'var(--bg-soft)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shown} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: s.step === 'generating' ? 0.35 : 1 }} />
                  {isAi && (
                    <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(17,17,17,.78)', color: 'white', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>
                      {s.step === 'preview' ? 'Preview · not approved yet' : 'AI illustration (live)'}
                    </span>
                  )}
                  {s.step === 'generating' && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--ink)' }}>
                      Generating… usually under a minute
                    </div>
                  )}
                </div>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  <div>
                    <a href={`/vehicle/${v.id}`} target="_blank" rel="noopener" style={{ fontWeight: 700, color: 'var(--ink)' }}>{v.year} {v.make} {v.model}</a>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                      {fmtPrice(v.price)}{v.stockNo ? ` · Stock ${v.stockNo}` : ''}{days !== null ? ` · ${days === 0 ? 'arrived today' : `${days}d in stock`}` : ''}
                    </div>
                  </div>
                  {s.step === 'error' && <div style={{ fontSize: 13, color: '#A8232C' }}>{s.message}</div>}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
                    {s.step === 'preview' ? (
                      <>
                        <button onClick={() => approve(v, s.url)} className="btn btn-primary btn-sm"><Icon name="check" size={13} /> Use this image</button>
                        <button onClick={() => generate(v)} className="btn btn-ghost btn-sm"><Icon name="refresh" size={13} /> Try again</button>
                        <button onClick={() => set(v.id, { step: 'idle' })} className="btn btn-ghost btn-sm">Discard</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => generate(v)} disabled={s.step === 'generating' || s.step === 'saving'} className="btn btn-dark btn-sm">
                          <Icon name="sparkles" size={13} /> {s.step === 'generating' ? 'Generating…' : s.step === 'saving' ? 'Saving…' : v.aiImage ? 'Regenerate' : 'Generate AI image'}
                        </button>
                        {v.aiImage && s.step === 'idle' && (
                          <button onClick={() => remove(v)} className="btn btn-ghost btn-sm" style={{ color: '#A8232C' }}>Remove</button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
